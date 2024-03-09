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

type CFSPlannedTask = Task & {
  lambda: number;
  vrt: number;
  // WARNING: "Task" already had this attribute...
  //events: number[];
};

type CFSTaskState = CFSPlannedTask & {
  // the following are going to be gradually added during the simulation, but are not required at ingress
  origvrt: number;
  // Total running time of the task
  sum: number;
  // Previous value of sum
  prev: number;
  // Graphics for the task's current state
  vrtlwk: {
    message: string;
    color: string;
  };
  // Available time quantum/slice
  q: number;
  // Current task state, X if running, empty otherwise
  R: string;
};

type CFSTaskSlot = TaskSlot & {
  // Virtual runtime
  vrt: number;
  // Same as "sum" in CFSTaskState
  sum: number;
  // Same as "prev" in CFSTaskState
  p: number;
  // Available time quantum/slice
  q: number;
};

type CFSClass = {
  // Name of the scheduling class
  type: string;
  // Wake up granularity
  wgup: number;
  latency: number;
  // Minimum granularity
  mingran: number;
};

type CFSPlan = Plan<CFSPlannedTask, CFSClass>;
type CFSStateTaskInfo = Plan<CFSTaskState, CFSClass>;

type CFSState = {
  origplan: CFSPlan;
  taskinfo: CFSStateTaskInfo;
  curr?: CFSTaskState;
  // Red&Black tree modelled as an array (list of tasks to schedule, ordered by virtual runtime)
  rbt: CFSTaskState[];
  // List of blocked/sleeping tasks
  blocked: CFSTaskState[];
  // Minimum virtual runtime in the rbt
  vmin?: number;
};

type CFSTaskStateSnapshot = {
  rbt: CFSTaskState[];
  blocked: CFSTaskState[];
  time: number;
};

type CFSTimer = {
  walltime: number;
  events: any[];
};

type CFSEventLoopRes = {
  rawSimData: CFSTaskStateSnapshot[];
  simData: Schedule;
};

let Table = require("easy-table");

// Cut to three decimal digits
let r2 = (x: number) => Math.round(x * 1000) / 1000;

let eventLoop = (
  options: any,
  origplan: CFSPlan,
  logger: Logger
): CFSEventLoopRes => {
  let taskstates = _.cloneDeep(origplan) as CFSStateTaskInfo;

  taskstates.tasks = _.map(taskstates.tasks, (t) => {
    t.origvrt = t.vrt;
    return t;
  });

  let schedstate: CFSState = {
    origplan: origplan,
    taskinfo: taskstates,
    curr: undefined,
    rbt: [],
    blocked: [],
    vmin: 0,
  };

  let timer: CFSTimer = {
    // Start 1 step before time=0 as to ready everything with such first step
    walltime: -taskstates.timer,
    events: [],
  };

  // Advance simulation time and process events that occurred in the elapsed time interval
  let updateTimer = (): CFSTaskStateSnapshot => {
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

    // Update available time slices of the tasks
    schedstate.rbt = _.map(schedstate.rbt, (t) => {
      t.q = schedslice(t);
      return t;
    });
    
    // If no task is currently running, run the first task in the runqueue
    // If the current time slice has expired, update the rbtree and schedule the next task
    // Note: this is required because the above ^ _map might update time slices after a
    // wakeup, and this handles the case of such update causing a time slice to end
    if (!_.isUndefined(schedstate.curr)) {
      if (schedstate.curr.sum - schedstate.curr.prev >= schedslice(schedstate.curr)) {
        schedstate.curr.vrtlwk = {
          message: `(new t.s. = ${schedstate.curr.q}) t.s. ended`,
          color: "black",
        };
        removeFromRbt(schedstate.curr);
        addToRbt(schedstate.curr);
        resched(`task ${schedstate.curr.name} finished quantum @${timer.walltime}`);
      }
    } else {
      resched(`no task running @${timer.walltime}`);
    }
    
    // Mark the currently running task (for the diagram)
    schedstate.rbt = _.map(schedstate.rbt, (t) => {
      if (!_.isUndefined(schedstate.curr) && schedstate.curr.index == t.index) {
        t.R = "X";
      } else {
        t.R = "";
      }
      return t;
    });

    // if (_.includes(timer.show, timer.walltime)) {
    logger.debug(`at time @${timer.walltime}`);
    logger.debug(Table.print(schedstate.rbt));
    logger.debug(Table.print(schedstate.blocked));
    // }

    // Create a snapshot of the current state
    let res: CFSTaskStateSnapshot = {
      rbt: _.cloneDeep(schedstate.rbt),
      blocked: _.cloneDeep(schedstate.blocked),
      time: timer.walltime,
    };
    
    // Reset all graphics before the next iteration
    _.map(
      taskstates.tasks,
      (t) => (t.vrtlwk = { message: "", color: "black" })
    );

    return res;
  };

  // Makes the first task in the rbtree the current running one (undefined if rbtree is empty)
  let resched = (msg: string) => {
    logger.debug(msg);
    if (schedstate.rbt.length > 0) {
      schedstate.curr = schedstate.rbt[0];
      schedstate.curr.prev = schedstate.curr.sum;
      logger.debug(
        `scheduled task ${schedstate.curr.name} to run @${timer.walltime}`
      );
    } else {
      schedstate.curr = undefined;
    }
  };

  // Gives the sum of all lambdas in the rbtree
  let sumlambda = () => _.reduce(schedstate.rbt, (a, t) => a + t.lambda, 0);

  // Computes the time slice for a given task according to the tasks currently in the rbtree
  let schedslice = (t: CFSTaskState) =>
    Math.max(taskstates.class.latency * (t.lambda / sumlambda()), taskstates.class.mingran);

  // Moves a task among the scheduled ones, in the rbtree.
  // Call reschedule if the added task qualifies for immediate execution
  let _start_task = (t: CFSTaskState) => {
    t.sum = 0;
    // on clone, don't use a lower vrt that would interrupt the current process

    // WARNING: this should be done with "addToRbt" after the next "if" that sets the vrt,
    // otherwise an eventual "resched" with more than 1 task in the rbtree places in execution
    // the wrong task due to the push that simply appends!
    //schedstate.rbt.push(t);
    // This should fix it!
    addToRbt(t);
    if (_.isUndefined(t.vrt)) {
      t.vrt = _.defaultTo(schedstate.vmin, 0) + schedslice(t) / t.lambda;
    }
    if (
      schedstate.curr === undefined ||
      t.vrt + taskstates.class.wgup * (t.lambda / sumlambda()) <
        schedstate.curr.vrt
    ) {
      // If the task has yet to run for at least mingran
      // postpone the preemption with an event
      if (!_.isUndefined(schedstate.curr) && schedstate.curr.sum - schedstate.curr.prev < taskstates.class.mingran) {
        t.vrtlwk = {
          message: `(${t.vrt} < ${schedstate.curr.vrt}) mingran`,
          color: "magenta",
        };
        _setTimeout(
          (args) => {
            let t = args[0];
            let old_curr_idx = args[1];
            let old_curr_prev = args[2];
            let m = args[3];
            // The running task changed, abort the old preemption
            // (Identify the task via its index, identify its unique
            // "running window" via "prev")
            if(
              !_.isUndefined(schedstate.curr) &&
              schedstate.curr.index === old_curr_idx &&
              schedstate.curr.prev === old_curr_prev) {
              t.vrtlwk = {
                message: `(${t.vrt} < ${schedstate.curr.vrt}) preempt`,
                color: "red",
              };
              resched(m);
            }
          },
          taskstates.class.mingran - (schedstate.curr.sum - schedstate.curr.prev),
          [t, schedstate.curr.index, schedstate.curr.prev, `Waking up task ${t.name} @${timer.walltime} (preemption delayed by mingran)`],
          "_mingran_preempt");
      } else {
        // Mingran already expired, preempt now
        if(!_.isUndefined(schedstate.curr)) {
          t.vrtlwk = {
            message: `(${t.vrt} < ${schedstate.curr.vrt}) preempt`,
            color: "red",
          };
        }
        resched(`Waking up task ${t.name} @${timer.walltime}`);
      }
    }
  };

  // Removes the task from the rbtree
  let removeFromRbt = (task: CFSTaskState) => {
    schedstate.rbt = _.filter(schedstate.rbt, (o) => !(o.index == task.index));
  };

  // Adds to the FRONT of the blocked list the given task
  let addBlocked = (task: CFSTaskState) => {
    schedstate.blocked.splice(0, 0, task);
  };

  // Removes a task from the blocked list
  let removeBlocked = (task: CFSTaskState) => {
    schedstate.blocked = _.filter(
      schedstate.blocked,
      (o) => !(o.index == task.index)
    );
  };

  // Add task to the rbtree (respecting the tree's order)
  let addToRbt = (task: CFSTaskState) => {
    schedstate.rbt.splice(
      _.sortedLastIndexBy(schedstate.rbt, task, "vrt"),
      0,
      task
    );
  };

  // Wakeup task, moving it from the blocked list to the rbtree,
  // and check for preemption
  let _wakeup = (tw: CFSTaskState) => {
    logger.debug(`Call to wake up ${tw.name} at @${timer.walltime}`);
    tw.vrt = Math.max(
      tw.vrt,
      (schedstate.vmin || 0) - taskstates.class.latency / 2
    );
    removeBlocked(tw);
    addToRbt(tw);
    // Next virtual runtime for the woken up task
    let v = r2(tw.vrt + taskstates.class.wgup * (tw.lambda / sumlambda()));
    // WARNING: useless to set this here...
    //if (!_.isUndefined(schedstate.curr)) {
    //  tw.vrtlwk = { message: `${v} < ${schedstate.curr.vrt}`, color: "black" };
    //}

    // Note: a preemption will happen iif the next virtual runtime of the woken up
    // task is lower than the vrt of the currently running task or if there is no
    // currently running task

    // Check for preemption (invoke resched if it occurs)
    if (schedstate.curr !== undefined && v < schedstate.curr.vrt) {
      // Preemption due to lower next virtual runtime
      logger.debug(`HEII ${v} ---- ${schedstate.curr.vrt}`);
      // Rebuild the runqueue's order
      // WARNING: not necessary to do this remove+add?
      removeFromRbt(schedstate.curr);
      addToRbt(schedstate.curr);
      // If the task has yet to run for at least mingran
      // postpone the preemption with an event
      if (schedstate.curr.sum - schedstate.curr.prev < taskstates.class.mingran) {
        tw.vrtlwk = {
          message: `(${tw.vrt} < ${schedstate.curr.vrt}) mingran`,
          color: "magenta",
        };
        // Schedule an event to handle the future (possible) preemption
        _setTimeout(
          (args) => {
            let t = args[0];
            let old_curr_idx = args[1];
            let old_curr_prev = args[2];
            let m = args[3];
            // The running task changed, abort the old preemption
            // (Identify the task via its index, identify its unique
            // "running window" via "prev")
            if(
              !_.isUndefined(schedstate.curr) &&
              schedstate.curr.index === old_curr_idx &&
              schedstate.curr.prev === old_curr_prev) {
              t.vrtlwk = {
                message: `(${t.vrt} < ${schedstate.curr.vrt}) preempt`,
                color: "red",
              };
              resched(m);
            }
          },
          taskstates.class.mingran - (schedstate.curr.sum - schedstate.curr.prev),
          [tw, schedstate.curr.index, schedstate.curr.prev, `Waking up task ${tw.name} @${timer.walltime} (preemption delayed by mingran)`],
          "_mingran_preempt");
      } else {
        // Mingran already expired, preempt now
        tw.vrtlwk = {
          message: `(${v} < ${schedstate.curr.vrt}) preempt`,
          color: "red",
        };
        resched(`Waking up task ${tw.name} @${timer.walltime}`);
      }
    } else {
      // Preemption because no currently running task
      if (schedstate.curr === undefined)
        resched(`Waking up task ${tw.name} @${timer.walltime}`);
      else {
        // No preemption
        tw.vrtlwk = {
          message: `(${v} < ${schedstate.curr.vrt}) cont`,
          color: "blue",
        };
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

      // No events occur on the currently running task
      if (schedstate.curr.events[0] >= delta) {
        schedstate.curr.sum = r2(schedstate.curr.sum + delta);
        schedstate.curr.vrt = r2(schedstate.curr.vrt + delta / schedstate.curr.lambda);
        schedstate.vmin = _.defaultTo(_.minBy(schedstate.rbt, "vrt"), {
          vrt: 0,
        }).vrt;
        /*
          IMPORTANT:
          In the current syntax, every elements of the "task.events" array indicates
          how much time passes before the next event occurs, starting AFTER the previous event.
          Ex: [2, 1] indicates that the first event occurs 2 units from now, and
          1 unit after such event another event follows!
          Another way to read it is:
          "Run for 2, sleep for 1, run for ..., sleep for ..., ..."
        
          To change such behavior, change the following line to decrement by "delta"
          every element of the array! Consequently events will refer to absolute time.

          Also, note that for a runnable task time passes, only while it is running, while
          for a sleeping task, time always passes. Thus only the currenlty running task
          and blocked ones have their events appraching!

          Events are treated in pairs, the first as a sleep, followed by a wakeup.
          A sleep with no subsequent wakup is treated as an exit.
          Thus, the number of events must be odd, resulting in an unpaired sleep, the exit.
        */
        schedstate.curr.events[0] = r2(schedstate.curr.events[0] - delta);

        // If the current time slice has expired, update the rbtree and schedule the next task
        if (
          // WARNING: wouldn't >= 0 be safer ?
          // Indeed, otherwise supporting mingran breaks this!
          schedstate.curr.sum - schedstate.curr.prev >= schedslice(schedstate.curr) &&
          // WARNING: isn't this one obvious due to the outer if?
          schedstate.curr.events[0] > 0
        ) {
          removeFromRbt(schedstate.curr);
          addToRbt(schedstate.curr);
          resched(`task ${schedstate.curr.name} finished quantum @${timer.walltime}`);
        }
      }
      // Event triggered on the currently running task
      // WARNING: wouldn't this be better as <= 0 ?
      if (schedstate.curr.events[0] === 0) {
        // The current task goes to sleep
        let ts = schedstate.curr;
        removeFromRbt(schedstate.curr);
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
          // WARNING: schedstate.curr is always defined, the inline-if is useless?
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
        }
        // Run the next task
        resched(`putting task to sleep ${ts.name} @${timer.walltime}`);
      }
    }
  };

  // For every task, schedule its start event at the start of the simulation
  _.map(taskstates.tasks, (t) => {
    _setTimeout(_start_task, t.arrival === 0 ? t.arrival : t.arrival + taskstates.timer, t, "_start_task");
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
let printData = (plan: CFSPlan) => {
  let taskevents = _.join(
    _.map(plan.tasks, (t) => {
      return [
        `\\item task ${t.name} (\\lambda = ${t.lambda}) inizia a ${t.arrival}, ` +
          _.join(
            _.map(t.events, (e, i) =>
              i % 2 === 0 ? `gira per ${e}` : `in attesa per ${e}`
            ),
            ", "
          ),
      ];
    }),
    "\n"
  );
  let s = `
  \\begin{itemize}
  \\item Dati scheduling: $\\bar{\\tau}$= ${plan.class.latency}, $\\mu$=${plan.class.mingran}, $\\omega$=${plan.class.wgup}
  ${taskevents}
  \\end{itemize}`;

  let legendAbove = `Schedule data: $\\bar{\\tau}$= ${plan.class.latency}, $\\mu$=${plan.class.mingran}, $\\omega$=${plan.class.wgup}`;

  return { blankData: s, legendAbove };
};

let serialiseSim = (
  cfsStateSnapshots: CFSTaskStateSnapshot[],
  cfsPlan: CFSStateTaskInfo
): Schedule => {
  // assume we always start from 0

  // Given a task and a timestep, finds the task's state from the snapshots
  let getCFSTaskSlot = (
    tindex: number,
    curtime: number
  ): Maybe<CFSTaskSlot> => {
    // Get rbtree and blocked list state at time "curtime" from the snapshots
    let { rbt, blocked } = _.defaultTo(
      _.find(cfsStateSnapshots, ({ time }) => {
        return time === curtime;
      }),
      { rbt: [], blocked: [] }
    );

    // Get the running task from the curtime's rbtree
    let findRunning = () => _.find(rbt, (t) => t.R === "X");
    let tr = findRunning();

    // If a running task exists...
    if (tr) {
      // If the requested task was the running one...
      if (rbt.length > 0 && tr.index === tindex) {
        return {
          event: "RAN",
          tstart: curtime,
          tend: curtime + cfsPlan.timer,
          index: tr.index,
          vrt: tr.vrt,
          sum: tr.sum,
          q: tr.q,
          p: tr.prev,
          aboveSlot: tr.vrtlwk,
          belowSlot: "",
          inSlot: "",
        };
      } else {
        let tt: CFSTaskState | undefined;
        // If the requested task is in the rbtree...
        if (!_.isUndefined((tt = _.find(rbt, (t) => t.index === tindex)))) {
          return {
            event: "RUNNABLE",
            tstart: curtime,
            tend: curtime + cfsPlan.timer,
            index: tt.index,
            vrt: tt.vrt,
            sum: tt.sum,
            aboveSlot: tt.vrtlwk,
            belowSlot: "",
            inSlot: "",
            q: 0,
            p: 0,
          };
        } else {
          // If the requested task is in the blocked list
          if (!_.isUndefined((tt = _.find(blocked, (t) => t.index === tindex)))) {
            // If the requested task has NOT yet exited...
            if (_.isUndefined(tt.exited) || curtime < tt.exited) {
              return {
                event: "BLOCKED",
                tstart: curtime,
                tend: curtime + cfsPlan.timer,
                index: tt.index,
                vrt: tt.vrt,
                sum: tt.sum,
                aboveSlot: tt.vrtlwk,
                belowSlot: "",
                inSlot: "",
                q: 0,
                p: 0,
              };
            } else {
              return {
                event: "EXITED",
                tstart: curtime,
                tend: curtime + cfsPlan.timer,
                index: tt.index,
                vrt: tt.vrt,
                sum: tt.sum,
                aboveSlot: tt.vrtlwk,
                belowSlot: "",
                inSlot: "",
                q: 0,
                p: 0,
              };
            }
          }
        }
      }
    }
  };

  let tasksToShow: TaskSlot[];

  tasksToShow = _.flattenDeep(
    _.map(cfsStateSnapshots, ({ time }, i) => {
      // Timeslots at time "time"
      let cfsTaskSlots = _.map(cfsPlan.tasks, (t) =>
        getCFSTaskSlot(t.index, time)
      ); // get all taskslots at time t

      let taskSlots: TaskSlot[];

      // Skip the last snapshot...
      if (i < cfsStateSnapshots.length - 1) {
        taskSlots = _.filter(
          _.map(cfsTaskSlots, (t) => {
            // Task t's state in the next snapshot
            let nextState: Maybe<CFSTaskSlot>;
            if (t) {
              nextState = getCFSTaskSlot(t.index, r2(time + cfsPlan.timer));
              let tslot: TaskSlot = t as TaskSlot;
              if (nextState) {
                // Write at time "time" the text decorating the task 
                tslot.belowSlot = nextState.vrt + "";
                tslot.inSlot =
                  t.event === "RAN" ? `${nextState.sum - t.p}/${r2(t.q)}` : "";
              }
              return tslot;
            }
          })
        ) as TaskSlot[];
        return taskSlots;
      } else return [];
    })
  );

  let scheddata = printData(cfsPlan);
  let plan: Plan<ScheduledTask, NoClass> = {
    timer: cfsPlan.timer,
    runfor: cfsPlan.runfor,
    graphics: cfsPlan.graphics,
    tasks: [],
    class: {},
    attributes: {}
  };

  plan.tasks = _.map(cfsPlan.tasks, (t) => {
    return {
      ...t,
      description: [`$\\rho=$${t.origvrt}`, `$\\lambda=$${t.lambda}`],
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
  return eventLoop(options, plan as CFSPlan, logger).simData;
};

export { eventLoop, produceSchedule, CFSPlan, CFSPlannedTask };
