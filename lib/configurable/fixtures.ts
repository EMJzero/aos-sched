import { SimPlan, GenericSimPlan, FIFOSchedClass, SJFSchedClass, SRTFSchedClass, RRSchedClass, HRRNSchedClass } from "./lib";

import _ from "lodash";

/*
IMPORTANT:
There are two ways a task can end:
- it reaches its last event and such event is a permanent sleep (no subsequent wakeup)
- it finishes its required computation time

Events alternate, the first is a sleep, then a wakeup, then sleep, ...
*/

let schedule1: GenericSimPlan = {
  timer: 0.5,
  runfor: 8,
  attributes: {
    "quantum": 1.5
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

let schedule0: GenericSimPlan = {
  timer: 0.5,
  runfor: 8,
  attributes: {
    "quantum": 1.5
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
  attributes: {
    "quantum": 1.5
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
  attributes: {
    "quantum": 1.5
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
  attributes: {},

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
  attributes: {
    "quantum": 1.5
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

//module.exports = { plansFIFO, plansSJF, plansSRTF };
export { allPlans };
