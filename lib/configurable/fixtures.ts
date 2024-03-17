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
];

let configurableGenerator = (
  type: string,
  tasksCount: number,
  timer?: number,
  runfor?: number,
  maxSleeps?: number,
  maxEventInterval? : number,
  maxArrivalTime? : number,
  quantum?: number
): GenericSimPlan => {
  timer = (!_.isUndefined(timer) ? max([0.1, timer]) : 0.5) as number;
  runfor = (!_.isUndefined(runfor) ? max([0.1, runfor]) : 12) as number;
  if ((runfor*10)%(timer*10) !== 0)
    throw Error("The value of \"runfor\" must be a multiple of \"timer\", also, limit their precision to one decimal points!");
  maxSleeps = (!_.isUndefined(maxSleeps) ? max([1, maxSleeps]) : 2) as number;
  maxEventInterval = (!_.isUndefined(maxEventInterval) ? max([0.5, maxEventInterval]) : 4) as number;
  maxArrivalTime = (!_.isUndefined(maxArrivalTime) ? max([0.5, maxArrivalTime]) : runfor/2) as number;
  quantum = (!_.isUndefined(quantum) ? quantum : 1.5) as number;

  let simPlan: GenericSimPlan = {
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
    }
  };
  
  if(type === "rr")
    simPlan.attributes["quantum"] = quantum;

  for(let i = 0; i < tasksCount; i++) {
    let task: PlannedTask = {
      index: i,
      name: `$t_${i+1}$`,
      // The events will determine the length of the task
      computation: runfor,
      arrival: _.random(0, maxArrivalTime),
      events: []
    };

    let eventsCount = _.random(0, maxSleeps)*2 + 1;
    for(let j = 0; j < eventsCount; j++)
      task.events.push(_.random(1, maxEventInterval));
    
    simPlan.tasks.push(task);
  }

  return simPlan;
}

export { allPlans, configurableGenerator };
