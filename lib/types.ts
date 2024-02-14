import { Logger } from "winston";
type Maybe<T> = T | undefined;

type TaskSlot = {
  tstart: number;
  event: string;
  tend: number;
  index: number;
  belowSlot: string;
  inSlot: string;
  aboveSlot: {
    message: string;
    color: string;
  };
};

type Plan<T, C> = {
  // Timestep-size for the simulation
  timer: number;
  // Total time span of the simulation
  runfor: number;
  graphics: any;
  tasks: T[];
  class: C;
};

type Task = {
  index: number;
  name: string;
  arrival: number;
  // Time before something occurs to the task after the previous event (or the start of its execution)
  /*
    IMPORTANT:
    In the current syntax, every elements of the "task.events" array indicates
    how much time passes before the next event occurs, starting AFTER the previous event.
    Ex: [2, 1] indicates that the first event occurs 2 units from now, and
    1 unit after such event another event follows!
    Another way to read it is:
    "Run for 2, sleep for 1, run for ..., sleep for ..., ..."

    Also, note that for a runnable task time passes, only while it is running, while
    for a sleeping task, time always passes. Thus only the currenlty running task
    and blocked ones have their events appraching!

    Events are treated in pairs, the first as a sleep, followed by a wakeup.
    A sleep with no subsequent wakup is treated as an exit.
    Thus, the number of events must be odd, resulting in an unpaired sleep, the exit.
  */
  events: number[];
  // If present, the time at which the task terminates execution
  exited?: number;
};

type NoClass = {};

type ScheduledTask = Task & {
  description: string[]; // actually, only the first two are printed.
};

type Options = { blank: Boolean };

type Schedule = {
  scheddata: {
    legendAbove: string;
    blankData: string;
  };
  plan: Plan<ScheduledTask, NoClass>;
  timeline: TaskSlot[];
};

interface ScheduleProducer {
  (options: any, plan: Plan<any, any>, logger: Logger): Schedule;
}

export {
  Schedule,
  ScheduleProducer,
  Plan,
  TaskSlot,
  Options,
  Task,
  ScheduledTask,
  NoClass,
  Maybe,
};
