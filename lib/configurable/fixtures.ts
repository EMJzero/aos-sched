import { SimPlan, GenericSimPlan, PlannedTask, FIFOSchedClass, SJFSchedClass, SRTFSchedClass, RRSchedClass, HRRNSchedClass } from "./lib";

import _, { max } from "lodash";

/*
IMPORTANT:
There are two ways a task can end:
- it reaches its last event and such event is a permanent sleep (no subsequent wakeup)
- it finishes its required computation time

Events alternate, the first is a sleep, then a wakeup, then sleep, ...
*/

let schedule0: GenericSimPlan = {
  timer: 0.5,
  runfor: 8,
  class : {},
  attributes: {
    quantum: 1.5
  },

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      computation: 8,
      arrival: 0,
      events: [8],
    },
    {
      index: 1,
      name: "$t_2$",
      computation: 8,
      arrival: 0,
      events: [8],
    },
    {
      index: 2,
      name: "$t_3$",
      computation: 8,
      arrival: 0,
      events: [8],
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule1: GenericSimPlan = {
  timer: 1,
  runfor: 16,
  class : {},
  attributes: {
    quantum: 1.5
  },

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      computation: 1,
      arrival: 0,
      events: [8],
    },
    {
      index: 1,
      name: "$t_2$",
      computation: 8,
      arrival: 2,
      events: [2, 1, 3],
    },
    {
      index: 2,
      name: "$t_3$",
      computation: 8,
      arrival: 4,
      events: [2],
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule2: GenericSimPlan = {
  timer: 0.5,
  runfor: 12,
  class : {},
  attributes: {
    quantum: 1.5
  },

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      computation: 9,
      arrival: 0,
      events: [1, 5, 8],
    },
    {
      index: 1,
      name: "$t_2$",
      computation: 20,
      arrival: 0,
      events: [14],
    },
    {
      index: 2,
      name: "$t_3$",
      computation: 8,
      arrival: 0,
      events: [3, 2, 10],
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule3: GenericSimPlan = {
  timer: 0.5,
  runfor: 24,
  class : {},
  attributes: {
    quantum: 1.5
  },

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      computation: 16,
      arrival: 0,
      events: [1, 2, 3, 4, 8],
    },
    {
      index: 1,
      name: "$t_2$",
      computation: 16,
      arrival: 0,
      events: [2, 2, 2, 3, 1],
    },
    {
      index: 2,
      name: "$t_3$",
      computation: 16,
      arrival: 0,
      events: [3, 1, 2, 3, 1],
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule4: GenericSimPlan = {
  timer: 0.5,
  runfor: 12,
  class : {},
  attributes: {
    quantum: 1.5
  },

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      computation: 4,
      arrival: 0,
      events: [1, 5, 8],
    },
    {
      index: 1,
      name: "$t_2$",
      computation: 4,
      arrival: 0,
      events: [3.5],
    },
    {
      index: 2,
      name: "$t_3$",
      computation: 1,
      arrival: 2,
      events: [2, 1, 1],
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule5: GenericSimPlan = {
  timer: 0.5,
  runfor: 6,
  class : {},
  attributes: {
    quantum: 1.0
  },

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      computation: 2,
      arrival: 0,
      events: [1.5, 2, 0.5],
    },
    {
      index: 1,
      name: "$t_2$",
      computation: 1,
      arrival: 1,
      events: [1],
    },
    {
      index: 2,
      name: "$t_3$",
      computation: 4,
      arrival: 2,
      events: [2, 1, 2],
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule6: GenericSimPlan = {
  timer: 0.5,
  runfor: 16,
  class : {},
  attributes: {
    quantum: 1.5
  },
  tasks: [
    { index: 0, name: "R", computation: 8, arrival: 0, events: [8] },
    { index: 1, name: "S", computation: 8, arrival: 0, events: [8] },
    { index: 2, name: "T", computation: 8, arrival: 0, events: [8] },
  ],
  graphics: { vspace: 1, hspace: 1, barheight: 0.5 },
};

let allPlans: GenericSimPlan[] = [
  schedule0,
  schedule1,
  schedule2,
  schedule3,
  schedule4,
  schedule5,
  schedule6
];

type GeneratedSimPlan = GenericSimPlan & {
  // Configuration of the generator
  genConfig : {}
};

let configurableGenerator = (
  type: string,
  tasksCount: number,
  timer?: number,
  runfor?: number,
  maxSleeps?: number,
  minEventInterval? : number,
  maxEventInterval? : number,
  maxArrivalTime? : number,
  quantum?: number
): GeneratedSimPlan => {
  timer = (!_.isUndefined(timer) ? max([0.1, timer]) : 0.5) as number;
  runfor = (!_.isUndefined(runfor) ? max([0.1, runfor]) : 12) as number;
  if ((runfor*10)%(timer*10) !== 0)
    throw Error("The value of \"runfor\" must be a multiple of \"timer\", also, limit their precision to one decimal points!");
  maxSleeps = (!_.isUndefined(maxSleeps) ? max([1, maxSleeps]) : 2) as number;
  minEventInterval = (!_.isUndefined(minEventInterval) ? max([0.5, minEventInterval]) : timer) as number;
  maxEventInterval = (!_.isUndefined(maxEventInterval) ? max([0.5, maxEventInterval]) : 4) as number;
  if (minEventInterval > maxEventInterval)
    throw Error("The value of \"min_event_interval\" must be a equal or less than \"max_event_interval\"!");
  maxArrivalTime = (!_.isUndefined(maxArrivalTime) ? max([0.5, maxArrivalTime]) : runfor/2) as number;
  quantum = (!_.isUndefined(quantum) ? quantum : 1.5) as number;

  let simPlan: GeneratedSimPlan = {
    timer: timer,
    runfor: runfor,
    class : {
      type: type
    },
    attributes: {},

    tasks: [],
    graphics: {
      vspace: 1,
      hspace: 1,
      barheight: 0.5,
    },

    genConfig: {
      type: type,
      tasksCount: tasksCount,
      timer: timer,
      runfor: runfor,
      maxSleeps: maxSleeps,
      maxEventInterval: maxEventInterval,
      maxArrivalTime: maxArrivalTime,
      quantum: quantum
    }
  };
  
  if(type === "rr")
    simPlan.attributes["quantum"] = quantum;

  let sampleWrapper = (arr: number[]): number => {
    let res = _.sample(arr);
    return res != undefined ? res : timer;
  }

  for(let i = 0; i < tasksCount; i++) {
    let intervals = _.range(timer, maxArrivalTime + timer, timer);
    let task: PlannedTask = {
      index: i,
      name: `$t_${i+1}$`,
      // The events will determine the length of the task
      computation: runfor,
      arrival: sampleWrapper(intervals),
      events: []
    };

    let eventsCount = _.random(0, maxSleeps)*2 + 1;
    intervals = _.range(minEventInterval, maxEventInterval + timer, timer);
    for(let j = 0; j < eventsCount; j++)
      task.events.push(sampleWrapper(intervals));
    
    simPlan.tasks.push(task);
  }

  return simPlan;
}

export { allPlans, configurableGenerator };
