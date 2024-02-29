// NOTE: any note stating in lower-case was already present in the code!

import _ from "lodash";
import { Logger } from "winston";
import {
  Plan,
  ScheduleProducer,
  Schedule,
  Task,
  TaskSlot,
  ScheduledTask,
  NoClass,
  Maybe,
} from "../types";

type PlannedTask = Task & {
  // Total execution time needed by the task
  computation: number;
};

type TaskState = PlannedTask & {
  // Total running time of the task
  sum: number;
  // Previous value of sum
  prev: number;
  // Time waited by the task while in the running queue
  wait: number;
  // Absolute time at which the task has been put in the runqueue,
  // updates at arrival and subsequent wakeups
  enqueue: number;
  // Graphics for the task's current state
  text: {
    message: string;
    color: string;
  };
  // Current task state, X if running, empty otherwise
  R: string;
};

type SimTaskSlot = TaskSlot & {
  sum: number;
  wait: number;
  // Metric depending on SchedClass
  schedmetric: number;
  p: number;
};

type SchedClass = {
  // Name of the scheduler
  type: string;
  // Name of the metric used to order the runqueue
  metric: string;
  // Predicate with the condition required for preemption on wakeup,
  // always return False to disable preemption!
  preempt_wakeup: (t: TaskState, s: State) => boolean;
  // Predicate with the condition required for preemption on timer tick,
  // always return False to disable preemption!
  preempt_tick: (t: TaskState, s: State) => boolean;
  // Returns the metric w.r.t. which the scheduling is performed
  schedmetric: (t?: TaskState) => number;
  // Order relation over the runqueue, modify it to change the scheduler type,
  // return true if t1 < t2
  order: (t1?: TaskState, t2?: TaskState) => boolean
};

const FIFOSchedClass : SchedClass = {
  type: "FIFO",
  metric: "enqueue time",
  // No preemption
  preempt_wakeup: (t: TaskState, s: State) => false,
  preempt_tick: (t: TaskState, s: State) => false,
  // Gives the time at which the task has been placed in the runqueue
  schedmetric: (t?: TaskState) => t ? t.enqueue : +Infinity,
  order: (t1?: TaskState, t2?: TaskState) => FIFOSchedClass.schedmetric(t1) < FIFOSchedClass.schedmetric(t2)
};

const SJFSchedClass : SchedClass = {
  type: "SJF",
  metric: "required computation time",
  // No preemption
  preempt_wakeup: (t: TaskState, s: State) => false,
  preempt_tick: (t: TaskState, s: State) => false,
  // Computes the required computation time for a task
  schedmetric: (t?: TaskState) => t ? t.computation - t.sum : +Infinity,
  order: (t1?: TaskState, t2?: TaskState) => SJFSchedClass.schedmetric(t1) < SJFSchedClass.schedmetric(t2)
};

const SRTFSchedClass : SchedClass = {
  type: "SRTF",
  metric: "remaining computation time",
  // Preempt if the new task has lower remaining computation time
  preempt_wakeup: (t: TaskState, s: State) => SRTFSchedClass.order(t, s.curr),
  preempt_tick: (t: TaskState, s: State) => false,
  // Computes the remaining computation time for a task
  schedmetric: (t?: TaskState) => t ? t.computation - t.sum : +Infinity,
  order: (t1?: TaskState, t2?: TaskState) => SRTFSchedClass.schedmetric(t1) < SRTFSchedClass.schedmetric(t2)
};

const RRSchedClass : SchedClass = {
  type: "RR",
  metric: "time quantum",
  // Preempt if the current task has finished its time quantum
  preempt_wakeup: (t: TaskState, s: State) => false,
  preempt_tick: (t: TaskState, s: State) => (t.sum - t.prev) >= s.origplan.attributes["quantum"],
  // Computes the remaining computation time for a task
  schedmetric: (t?: TaskState) => t ? t.enqueue : +Infinity,
  order: (t1?: TaskState, t2?: TaskState) => SRTFSchedClass.schedmetric(t1) < SRTFSchedClass.schedmetric(t2)
};

type SimPlan = Plan<PlannedTask, SchedClass>;
type TasksState = Plan<TaskState, SchedClass>;

type State = {
  origplan: SimPlan;
  taskinfo: TasksState;
  // Currently running task
  curr?: TaskState;
  // Red&black tree modelled as an array (list of tasks to schedule, ordered by virtual runtime)
  runqueue: TaskState[];
  // List of blocked/sleeping tasks
  blocked: TaskState[];
};

type TaskStateSnapshot = {
  rbt: TaskState[];
  blocked: TaskState[];
  time: number;
};

type Timer = {
  walltime: number;
  events: any[];
};

type EventLoopRes = {
  rawSimData: TaskStateSnapshot[];
  simData: Schedule;
};

let Table = require("easy-table");

// Cut to three decimal digits
let r2 = (x: number) => Math.round(x * 1000) / 1000;

let eventLoop = (
  options: any,
  origplan: SimPlan,
  logger: Logger
): EventLoopRes => {
  let taskstates = _.cloneDeep(origplan) as TasksState;

  let schedstate: State = {
    origplan: origplan,
    taskinfo: taskstates,
    curr: undefined,
    runqueue: [],
    blocked: []
  };

  let timer: Timer = {
    // Start 1 step before time=0 as to ready everything with such first step
    walltime: -taskstates.timer,
    events: [],
  };

  // Advance simulation time and process events that occurred in the elapsed time interval
  let updateTimer = (): TaskStateSnapshot => {
    timer.walltime = r2(timer.walltime + taskstates.timer);
    // console.log(timer);

    /* Prioritize tasktick */

    // First, any tasktick event occurred before the new walltime is extracted
    let firable_tt = _.remove(
      timer.events,
      (e) => e.type === "_task_tick" && r2(e.deadline) <= timer.walltime
    );
    // Fire the events
    _.map(firable_tt, (e) => {
      e.func(e.arg);
    });

    // Second, any other event occurred before the new walltime is extracted
    let firable = _.remove(
      timer.events,
      (e) => r2(e.deadline) <= timer.walltime
    );
    // Fire the events
    _.map(firable, (e) => {
      e.func(e.arg);
    });

    // Update available time slices of the tasks, if no task is currently running,
    // run the first task in the runqueue (mark it with "X")
    schedstate.runqueue = _.map(schedstate.runqueue, (t) => {
      if (!_.isUndefined(schedstate.curr) && schedstate.curr.index == t.index) {
        t.R = "X";
      } else {
        t.R = "";
      }
      return t;
    });

    logger.debug(`at time @${timer.walltime}`);
    logger.debug(Table.print(schedstate.runqueue));
    logger.debug(Table.print(schedstate.blocked));

    // Create a snapshot of the current state
    let res: TaskStateSnapshot = {
      rbt: _.cloneDeep(schedstate.runqueue),
      blocked: _.cloneDeep(schedstate.blocked),
      time: timer.walltime,
    };
    
    // Reset all graphics before the next iteration
    _.map(
      taskstates.tasks,
      (t) => (t.text = { message: "", color: "black" })
    );

    return res;
  };

  // Makes the first task in the runqueue the current running one (undefined if runqueue is empty)
  let resched = (msg: string) => {
    logger.debug(msg);
    if (schedstate.runqueue.length > 0) {
      schedstate.curr = schedstate.runqueue[0];
      schedstate.curr.prev = schedstate.curr.sum;
      logger.debug(
        `scheduled task ${schedstate.curr.name} to run @${timer.walltime}`
      );
    } else {
      schedstate.curr = undefined;
    }
  };

  // Moves a task among the scheduled ones, in the runqueue.
  // Call reschedule if the added task qualifies for immediate execution
  let _start_task = (t: TaskState) => {
    t.sum = 0;
    t.prev = 0;
    // DOUBLE CHECK THIS!! Maybe use schedstate.runqueue.push(t)?
    addToRunqueue(t);
    if (schedstate.curr === undefined || taskstates.class.preempt_wakeup(t, schedstate)) {
      resched(`starting task ${t.name} @${timer.walltime}`);
    }
  };

  // Removes the task from the runqueue
  let removeFromRunqueue = (task: TaskState) => {
    schedstate.runqueue = _.filter(schedstate.runqueue, (o) => !(o.index == task.index));
  };

  // Adds to the FRONT of the blocked list the given task
  let addBlocked = (task: TaskState) => {
    schedstate.blocked.splice(0, 0, task);
  };

  // Removes a task from the blocked list
  let removeBlocked = (task: TaskState) => {
    schedstate.blocked = _.filter(
      schedstate.blocked,
      (o) => !(o.index == task.index)
    );
  };

  // Add task to the runqueue (respecting the queue's order),
  // uses the scheduler's predicate to infer the order relation
  let addToRunqueue = (task: TaskState) => {
    schedstate.runqueue.splice(
      schedstate.runqueue.findIndex((t) => taskstates.class.order(task, t)),
      0,
      task
    );
    task.enqueue = timer.walltime;
    task.wait = 0;
  };

  // Wakeup task, moving it from the blocked list to the runqueue,
  // and check for preemption
  let _wakeup = (tw: TaskState) => {
    logger.debug(`Call to wake up ${tw.name} at @${timer.walltime}`);
    removeBlocked(tw);
    addToRunqueue(tw);

    tw.text = {
      message: `(woken up: ${taskstates.class.schedmetric(tw)})`,
      color: "black"
    };
    if (!_.isUndefined(schedstate.curr)) {
      tw.text.message += `, curr: ${taskstates.class.schedmetric(schedstate.curr)}`;
    }
    tw.text.message += ")";

    // Check for preemption (invoke resched if it occurs)
    if (schedstate.curr !== undefined && taskstates.class.preempt_wakeup(tw, schedstate)) {
      // Preemption as per the SchedClass's rules
      tw.text.message += " preempt",
      tw.text.color = "red";
      logger.debug(`HEII ${taskstates.class.schedmetric(tw)} ---- ${taskstates.class.schedmetric(schedstate.curr)}`);
      // Rebuild the runqueue's order
      // WARNING: not necessary to do this?
      removeFromRunqueue(schedstate.curr);
      addToRunqueue(schedstate.curr);
      resched(`Waking up task ${tw.name} @${timer.walltime}`);
    } else {
      if (schedstate.curr === undefined)
        // Preemption because no currently running task
        resched(`Waking up task ${tw.name} @${timer.walltime}`);
      else {
        // No preemption
        tw.text.message += " continue",
        tw.text.color = "blue";
      }
    }
  };

  // Schedules a future event to be handled by the event loop
  // NOTE: ms is the amount of time in the future W.R.T. now, the walltime
  // is added here! Thus ms is how much in the future to schedule the event!
  let _setTimeout = (func, ms: number, arg, type) => {
    timer.events.push({ deadline: ms + timer.walltime, func, arg, type });
  };

  // Schedules the event of the basic CFS update, that handles:
  // - task sleep events
  // - time slice expiration
  // - task exit (sleep without subsequent wakeup)
  let _task_tick = () => {
    // Re-schedule this same event for the next simulation step, thus taskstates.timer in the future
    _setTimeout(_task_tick, taskstates.timer, undefined, "_task_tick");

    if (schedstate.curr !== undefined) {
      // Delta is the timestep
      let delta = taskstates.timer;

      // Update the time waited by tasks in the runqueue
      schedstate.runqueue = _.map(schedstate.runqueue, (t) => {
        if (t.index !== schedstate.curr?.index)
          t.wait += delta;
        return t;
      });

      /*
      IMPORTANT:
      Currently any event that does NOT occur exactly on a simulation tick
      is handled AS IF it occurs on the tick immediately after its actual occurrence!
      */

      // No events occur on the currently running task
      // CHANGED FROM: >= delta
      console.log(schedstate)
      console.log(schedstate.curr)
      console.log(schedstate.curr.events)
      console.log(schedstate.curr.events[0])
      if (schedstate.curr.events[0] > 0) {
        schedstate.curr.sum = r2(schedstate.curr.sum + delta);

        // See types.ts -> Task -> events for a detailed explanation of this behaviour
        console.log("Before: " + schedstate.curr.events[0])
        schedstate.curr.events[0] = r2(schedstate.curr.events[0] - delta);
        console.log("After: " + schedstate.curr.events[0])

        // If the current task's computation time has been satisfied, exit it
        if (schedstate.curr.computation - schedstate.curr.sum <= 0) {
          exitCurrentTask();
          resched(`exiting task ${schedstate.curr.name} @${timer.walltime}`);
        }

        // If the current time slice has expired, update the runqueue and schedule the next task
        if (taskstates.class.preempt_tick(schedstate.curr, schedstate)) {
          // The current task goes to sleep
          let ts = schedstate.curr;
          removeFromRunqueue(schedstate.curr);
          addBlocked(schedstate.curr);
          // Run the next task
          resched(`task ${schedstate.curr.name} finished quantum @${timer.walltime}`);
        }
      }

      // Event triggered on the currently running task
      // CHANGED FROM: === 0
      // NOTE: yeah, this could be an "else" XD
      if (schedstate.curr.events[0] <= 0) {
        // The current task goes to sleep
        let ts = schedstate.curr;
        removeFromRunqueue(schedstate.curr);
        addBlocked(schedstate.curr);

        // Schedule the task's wakeup, the time until wakeup is given by the task's next event
        let blocktime = ts.events[1];
        if (!_.isUndefined(blocktime)) {
          _setTimeout(_wakeup, blocktime, ts, "_wakeup");
          // Remove the two used events (sleep and wakeup)
          ts.events = _.tail(_.tail(ts.events));
        } else {
          // If no subsequent wakeup event is present in the plan, the sleep is treated as an exit,
          // and the current task's "exited" field is written
          exitCurrentTask();
        }
        // Run the next task
        resched(`putting task to sleep ${ts.name} @${timer.walltime}`);
      }
    }
  };

  let exitCurrentTask = () => {
    let v = _.find(
      taskstates.tasks,
      (t) => t.index === (schedstate.curr ? schedstate.curr.index : 0)
    );
    if (v) {
      v.exited = timer.walltime;
    }

    let vp = _.find(
      schedstate.origplan.tasks,
      (t) => t.index === (schedstate.curr ? schedstate.curr.index : 0)
    );
    if (vp) {
      vp.exited = timer.walltime;
    }
  };

  // For every task, schedule its start event at the start of the simulation
  _.map(taskstates.tasks, (t) => {
    _setTimeout(_start_task, t.arrival, t, "_start_task");
  });

  // Schedule the first occurrence of the tick event (afterwwards it automatically re-schedules itself)
  _setTimeout(_task_tick, 2 * taskstates.timer, undefined, "_task_tick");

  // Run the function to advance the simulation and process events, do it for every
  // time step along the length of the simulation
  let rawSchedule = _.map(
    _.range(1, taskstates.runfor / taskstates.timer + 2),
    updateTimer
  );

  return {
    rawSimData: rawSchedule, // <- this is the one being tested by jest
    simData: serialiseSim(rawSchedule, taskstates), // this is the serialised format
  };
};

// Print the state/setup of the plan
let printData = (plan: SimPlan) => {
  let taskevents = _.join(
    _.map(plan.tasks, (t) => {
      return [
        `\\item task ${t.name} (\\length = ${t.computation}) arrives at ${t.arrival}, ` +
          _.join(
            _.map(t.events, (e, i) =>
              i % 2 === 0 ? `runs for ${e}` : `waits for ${e}`
            ),
            ", "
          ),
      ];
    }),
    "\n"
  );
  let s = `
  \\begin{itemize}
  \\item Schedule data: type = ${plan.class.type}, metric = ${plan.class.metric}
  ${taskevents}
  \\end{itemize}`;

  let legendAbove = `Schedule data: type = ${plan.class.type}, metric = ${plan.class.metric}`;

  return { blankData: s, legendAbove };
};

let serialiseSim = (
  stateSnapshots: TaskStateSnapshot[],
  simPlan: TasksState
): Schedule => {
  // assume we always start from 0

  // Given a task and a timestep, finds the task's state from the snapshots
  let getTaskSlot = (
    tindex: number,
    curtime: number
  ): Maybe<SimTaskSlot> => {
    // Get runqueue and blocked list state at time "curtime" from the snapshots
    let { rbt, blocked } = _.defaultTo(
      _.find(stateSnapshots, ({ time }) => {
        return time === curtime;
      }),
      { rbt: [], blocked: [] }
    );

    // Get the running task from the curtime's runqueue
    let findRunning = () => _.find(rbt, (t) => t.R === "X");
    let tr = findRunning();

    // If a running task exists...
    if (tr) {
      // If the requested task was the running one...
      if (rbt.length > 0 && tr.index === tindex) {
        return {
          event: "RAN",
          tstart: curtime,
          tend: curtime + simPlan.timer,
          index: tr.index,
          sum: tr.sum,
          wait: 0,
          //q: tr.q,
          p: tr.prev,
          aboveSlot: tr.text,
          belowSlot: "",
          inSlot: "",
          schedmetric: simPlan.class.schedmetric(tr)
        };
      } else {
        let tt: TaskState | undefined;
        // If the requested task is in the runqueue...
        if (!_.isUndefined((tt = _.find(rbt, (t) => t.index === tindex)))) {
          return {
            event: "RUNNABLE",
            tstart: curtime,
            tend: curtime + simPlan.timer,
            index: tt.index,
            sum: tt.sum,
            wait: tr.wait,
            aboveSlot: tt.text,
            belowSlot: "",
            inSlot: "",
            //q: 0,
            p: 0,
            schedmetric: simPlan.class.schedmetric(tt)
          };
        } else {
          // If the requested task is in the blocked list
          if (!_.isUndefined((tt = _.find(blocked, (t) => t.index === tindex)))) {
            // If the requested task has NOT yet exited...
            if (_.isUndefined(tt.exited) || curtime < tt.exited) {
              return {
                event: "BLOCKED",
                tstart: curtime,
                tend: curtime + simPlan.timer,
                index: tt.index,
                sum: tt.sum,
                wait: tr.wait,
                aboveSlot: tt.text,
                belowSlot: "",
                inSlot: "",
                //q: 0,
                p: 0,
                schedmetric: simPlan.class.schedmetric(tt)
              };
            } else {
              return {
                event: "EXITED",
                tstart: curtime,
                tend: curtime + simPlan.timer,
                index: tt.index,
                sum: tt.sum,
                wait: tr.wait,
                aboveSlot: tt.text,
                belowSlot: "",
                inSlot: "",
                //q: 0,
                p: 0,
                schedmetric: simPlan.class.schedmetric(tt)
              };
            }
          }
        }
      }
    }
  };

  let tasksToShow: TaskSlot[];

  tasksToShow = _.flattenDeep(
    _.map(stateSnapshots, ({ time }, i) => {
      // Timeslots at time "time"
      let cfsTaskSlots = _.map(simPlan.tasks, (t) =>
        getTaskSlot(t.index, time)
      ); // get all taskslots at time t

      let taskSlots: TaskSlot[];

      // Skip the last snapshot...
      if (i < stateSnapshots.length - 1) {
        taskSlots = _.filter(
          _.map(cfsTaskSlots, (t) => {
            // Task t's state in the next snapshot
            let nextState: Maybe<SimTaskSlot>;
            if (t) {
              nextState = getTaskSlot(t.index, r2(time + simPlan.timer));
              let tslot: TaskSlot = t as TaskSlot;
              if (nextState) {
                // Write at time "time" the text decorating the task 
                tslot.belowSlot = nextState.schedmetric + "";
                tslot.inSlot = t.event === "RAN" ? (simPlan.class == RRSchedClass ? `${nextState.sum - t.p}/${r2(t.q)}` : `${nextState.sum - t.p}}`) : "";
              }
              return tslot;
            }
          })
        ) as TaskSlot[];
        return taskSlots;
      } else return [];
    })
  );

  let scheddata = printData(simPlan);
  let plan: Plan<ScheduledTask, NoClass> = {
    timer: simPlan.timer,
    runfor: simPlan.runfor,
    graphics: simPlan.graphics,
    tasks: [],
    class: {},
  };

  plan.tasks = _.map(simPlan.tasks, (t) => {
    return {
      ...t,
      description: [`length = ${t.computation}`],
    };
  });

  return {
    timeline: tasksToShow,
    plan: plan,
    scheddata,
  };
};

let produceSchedule: ScheduleProducer;
produceSchedule = function (
  options: any,
  plan: Plan<any, any>,
  logger: Logger
) {
  return eventLoop(options, plan as SimPlan, logger).simData;
};

export { eventLoop, produceSchedule, SimPlan, FIFOSchedClass, SJFSchedClass, SRTFSchedClass, RRSchedClass };
