import { SimPlan, FIFOSchedClass, SJFSchedClass, SRTFSchedClass } from "./lib";

import _ from "lodash";

/*
IMPORTANT:
There are two ways a task can end:
- it reaches its last event and such event is a permanent sleep (no subsequent wakeup)
- it finishes its required computation time

Events alternate, the first is a sleep, then a wakeup, then sleep, ...
*/

let schedule1: SimPlan = {
  timer: 0.5,
  runfor: 8,
  class: FIFOSchedClass,

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

let schedule0: SimPlan = {
  timer: 0.5,
  runfor: 8,
  class: FIFOSchedClass,

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

let schedule2: SimPlan = {
  timer: 0.5,
  runfor: 12,
  class: FIFOSchedClass,

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
      events: [3, 1, 10],
    },
  ],
  graphics: {
    vspace: 1,
    hspace: 1,
    barheight: 0.5,
  },
};

let schedule3: SimPlan = {
  timer: 0.5,
  runfor: 24,
  class: FIFOSchedClass,

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

let schedule4: SimPlan = {
  timer: 0.5,
  runfor: 16,
  class: FIFOSchedClass,
  tasks: [
    { index: 0, name: "R", computation: 8, arrival: 0, events: [8] },
    { index: 1, name: "S", computation: 8, arrival: 0, events: [8] },
    { index: 2, name: "T", computation: 8, arrival: 0, events: [8] },
  ],
  graphics: { vspace: 1, hspace: 1, barheight: 0.5 },
};

let plansFIFO: SimPlan[] = [
  schedule0,
  schedule1,
  schedule2,
  schedule3,
  schedule4,
];

let plansSJF: SimPlan[] = _.map(plansFIFO, (p) => {
  p.class = SJFSchedClass;
  return p;
});

let plansSRTF: SimPlan[] = _.map(plansFIFO, (p) => {
  p.class = SRTFSchedClass;
  return p;
});

module.exports = { plansFIFO, plansSJF, plansSRTF };
