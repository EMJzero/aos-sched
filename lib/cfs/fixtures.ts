import { CFSPlan, CFSPlannedTask } from "./lib";

import _, {max, min} from "lodash";

// Test for arrival time
let schedule0: CFSPlan = {
  timer: 0.5,
  runfor: 8,
  class: {
    type: "cfs",
    latency: 6.0,
    mingran: 0.75,
    wgup: 1,
  },
  attributes: {},

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      lambda: 1,
      arrival: 1,
      events: [8],
      // override vrt
      vrt: 100.0,
    },
    {
      index: 1,
      name: "$t_2$",
      lambda: 1,
      arrival: 2,
      events: [8],
      vrt: 100.5,
    },
    {
      index: 2,
      name: "$t_3$",
      lambda: 1,
      arrival: 0,
      events: [8],
      vrt: 101.0,
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule1: CFSPlan = {
  timer: 0.5,
  runfor: 8,
  class: {
    type: "cfs",
    latency: 6.0,
    mingran: 0.75,
    wgup: 1,
  },
  attributes: {},

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      lambda: 1,
      arrival: 0,
      events: [8],
      // override vrt
      vrt: 100.0,
    },
    {
      index: 1,
      name: "$t_2$",
      lambda: 1.5,
      arrival: 0,
      events: [8],
      vrt: 100.5,
    },
    {
      index: 2,
      name: "$t_3$",
      lambda: 0.5,
      arrival: 0,
      events: [8],
      vrt: 101.0,
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule2: CFSPlan = {
  timer: 0.5,
  runfor: 12,
  class: {
    type: "cfs",
    latency: 6.0,
    mingran: 0.75,
    wgup: 1,
  },
  attributes: {},

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      lambda: 1,
      arrival: 0,
      events: [1, 5, 8],
      // override vrt
      vrt: 100.0,
    },
    {
      index: 1,
      name: "$t_2$",
      lambda: 1,
      arrival: 0,
      events: [14],
      vrt: 100.5,
    },
    {
      index: 2,
      name: "$t_3$",
      lambda: 1,
      arrival: 0,
      events: [3, 1, 10],
      vrt: 101.0,
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule3: CFSPlan = {
  timer: 0.5,
  runfor: 24,
  class: {
    type: "cfs",
    latency: 6.0,
    mingran: 0.75,
    wgup: 1,
  },
  attributes: {},

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      lambda: 1,
      arrival: 0,
      events: [1, 2, 3, 4, 8],
      // override vrt
      vrt: 100.0,
    },
    {
      index: 1,
      name: "$t_2$",
      lambda: 1,
      arrival: 0,
      events: [2, 2, 2, 3, 1],
      vrt: 100.5,
    },
    {
      index: 2,
      name: "$t_3$",
      lambda: 1,
      arrival: 0,
      events: [3, 1, 2, 3, 1],
      vrt: 101.0,
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

// Test for mingran 1
let schedule4: CFSPlan = {
  timer: 0.5,
  runfor: 12,
  class: {
    type: "cfs",
    latency: 6.0,
    mingran: 4,
    wgup: 1,
  },
  attributes: {},

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      lambda: 1,
      arrival: 0,
      events: [1, 5, 8],
      vrt: 100.0,
    },
    {
      index: 1,
      name: "$t_2$",
      lambda: 1,
      arrival: 0,
      events: [14],
      vrt: 100.5,
    },
    {
      index: 2,
      name: "$t_3$",
      lambda: 1,
      arrival: 0,
      events: [3, 1, 10],
      vrt: 101.0,
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

// Test for mingran 2
let schedule5: CFSPlan = {
  timer: 0.5,
  runfor: 16,
  class: {
    type: "cfs",
    latency: 6.0,
    mingran: 1.5,
    wgup: 1,
  },
  attributes: {},

  tasks: [
    {
      index: 0,
      name: "$t_1$",
      lambda: 1,
      arrival: 0,
      events: [14],
      vrt: 100.0,
    },
    {
      index: 1,
      name: "$t_2$",
      lambda: 1,
      arrival: 0,
      events: [14],
      vrt: 100.0,
    },
    {
      index: 2,
      name: "$t_3$",
      lambda: 1,
      arrival: 0,
      events: [1, 1, 1, 1, 2, 2, 2, 2],
      vrt: 100.0,
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule6: CFSPlan = {
  timer: 0.5,
  runfor: 16,
  class: { type: "cfs", latency: 6.0, mingran: 0.75, wgup: 1 },
  attributes: {},
  tasks: [
    { index: 0, name: "R", lambda: 4, arrival: 0, events: [8], vrt: 0.0 },
    { index: 1, name: "S", lambda: 1, arrival: 0, events: [8], vrt: 0.0 },
    { index: 2, name: "T", lambda: 1, arrival: 0, events: [8], vrt: 0.0 },
  ],
  graphics: { vspace: 1, hspace: 1, barheight: 0.5 },
};

let plans: CFSPlan[] = [
  schedule0,
  schedule1,
  schedule2,
  schedule3,
  schedule4,
  schedule5,
  schedule6,
];

let cfsGenerator = (
  tasksCount: number,
  timer?: number,
  runfor?: number,
  latency?: number,
  mingran?: number,
  wgup?: number,
  maxSleeps?: number,
  maxEventInterval? : number,
  maxArrivalTime? : number,
): CFSPlan => {
  timer = (!_.isUndefined(timer) ? max([0.1, timer]) : 0.5) as number;
  runfor = (!_.isUndefined(runfor) ? max([0.1, runfor]) : 12) as number;
  if ((runfor*10)%(timer*10) !== 0)
    throw Error("The value of \"runfor\" must be a multiple of \"timer\", also, limit their precision to one decimal points!");
  latency = (!_.isUndefined(latency) ? max([0.1, latency]) : 6.0) as number;
  mingran = (!_.isUndefined(mingran) ? max([0, mingran]) : 0.75) as number;
  wgup = (!_.isUndefined(wgup) ? max([0.1, wgup]) : 1) as number;
  maxSleeps = (!_.isUndefined(maxSleeps) ? max([1, maxSleeps]) : 2) as number;
  maxEventInterval = (!_.isUndefined(maxEventInterval) ? max([0.5, maxEventInterval]) : 4) as number;
  maxArrivalTime = (!_.isUndefined(maxArrivalTime) ? max([0.5, maxArrivalTime]) : runfor/2) as number;

  let simPlan: CFSPlan = {
    timer: timer,
    runfor: runfor,
    class : {
      type: "cfs",
      latency: latency,
      mingran: mingran,
      wgup: wgup
    },
    attributes: {},

    tasks: [],
    graphics: {
      vspace: 1,
      hspace: 1,
      barheight: 0.5,
    }
  };
  
  for(let i = 0; i < tasksCount; i++) {
    let task: CFSPlannedTask = {
      index: i,
      name: `$t_${i+1}$`,
      //TODO: make it customizable
      lambda: 1,
      // The events will determine the length of the task
      arrival: _.random(0, maxArrivalTime),
      events: [],
      //TODO: make it customizable
      vrt: 100.0
    };

    let eventsCount = _.random(0, maxSleeps)*2 + 1;
    for(let j = 0; j < eventsCount; j++)
      task.events.push(_.random(1, maxEventInterval));
    
    simPlan.tasks.push(task);
  }

  return simPlan;
}

export { plans, cfsGenerator };