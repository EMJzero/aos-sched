import { CFSPlan } from "./lib";

import _ from "lodash";

let schedule1: CFSPlan = {
  timer: 0.5,
  runfor: 8,
  class: {
    type: "CFS",
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

let schedule0: CFSPlan = {
  timer: 0.5,
  runfor: 8,
  class: {
    type: "CFS",
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
      lambda: 1,
      arrival: 0,
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

let schedule2: CFSPlan = {
  timer: 0.5,
  runfor: 12,
  class: {
    type: "CFS",
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
    type: "CFS",
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

let schedule4: CFSPlan = {
  timer: 0.5,
  runfor: 16,
  class: { type: "CFS", latency: 6.0, mingran: 0.75, wgup: 1 },
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
  // { ...schedule2, timer: 0.25 },
  // { ...schedule0, runfor: 30 },
  // { ...schedule2, runfor: 40 },
  // { ...schedule2, timer: 0.25, runfor: 40 },
  // { ...schedule1, runfor: 40 },
];

//module.exports = { plans };
export { plans };