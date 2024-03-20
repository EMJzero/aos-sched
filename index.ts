#!/usr/bin/env bun

import { program } from "@caporal/core";

import { exportLatex, exportLatexSummary } from "./lib/artifacts";
import { Schedule, Plan, GenericPlan, ScheduleProducer } from "./lib/types";
import { FIFOSchedClass, RRSchedClass, SJFSchedClass, SRTFSchedClass, HRRNSchedClass, schedClassFromString } from "./lib/configurable/lib";
import { string } from "easy-table";

import _ from "lodash";

type Tests = {
  cfs: Plan<any, any>[];
  configurable: GenericPlan<any>[];
};

type Simulators = {
  cfs: ScheduleProducer;
  configurable: ScheduleProducer;
};

let tests: Tests = {
  cfs: require("./lib/cfs/fixtures").plans as Plan<any, any>[],
  configurable: require("./lib/configurable/fixtures").allPlans as GenericPlan<any>[],
};

let configurableGenerator = require("./lib/configurable/fixtures").configurableGenerator;
let cfsGenerator = require("./lib/cfs/fixtures").cfsGenerator;

let sims: Simulators = {
  cfs: require("./lib/cfs/lib").produceSchedule as ScheduleProducer,
  configurable: require("./lib/configurable/lib").produceSchedule as ScheduleProducer,
};

let $fs = require("mz/fs");
let $gstd = require("get-stdin");

let main = () => {
  program
    .name("aos-sched")
    .description("Create temporal diagrams of AOS realtime schedulers")
    .command("dump", "Dump out examples")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs", "fifo", "sjf", "srtf", "hrrn", "rr"],
    })
    .argument("<num>", "Example number", {
      validator: program.NUMBER,
    })
    .action(({ args }) => {
      let n: number = parseInt(args.num + "");
      if (args.sched === "cfs") {
        console.log(JSON.stringify(tests.cfs[n]));
      } else {
        // Inject the scheduler string, then return the JSON
        let plan = tests.configurable[n];
        plan.class["type"] = args.sched;
        console.log(JSON.stringify(plan));
      }
    })
    .command("gen", "Generate random plan")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs", "fifo", "sjf", "srtf", "hrrn", "rr"],
    })
    .argument("<tasks_count>", "Number of tasks to generate", {
      validator: program.NUMBER,
    })
    .option("--tm <timer>", "Time step for the simulation (default: 0.5)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--rf <runfor>", "Duration of the simulation (default: 12)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--ms <max_sleeps>", "Maximum number of time a task can go to sleep (default: 2)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--mei <max_event_interval>", "Maximum time between a sleep and a wakeup or viceversa (default: 4)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--mat <max_arrival_time>", "Maximum time at which tasks can arrive (default: 6)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--qt <quantum>", "Meaningful only if <sched> = \"rr\", time quantum for round robin (default: 1.5)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--lt <latency>", "Meaningful only if <sched> = \"cfs\", latency for CFS (default: 6)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--mg <mingran>", "Meaningful only if <sched> = \"cfs\", minimum granularity for CFS (default: 0.75)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--wgup <wakeup_granularity>", "Meaningful only if <sched> = \"cfs\", wakeup granularity for CFS (default: 1)", {
      validator: program.NUMBER,
      default: undefined
    })
    .option("--lr <lambda_range>", "Meaningful only if <sched> = \"cfs\", lower and upper bound for lambdas, must be an array of length 2 (default: (0.5, 2.5)). Values will be forced to a decimal of .5 or .0. Note that arrays must be written as \"1, 2\".", {
      validator: program.ARRAY,
      default: undefined
    })
    .option("--vrtr <initial_vrt_range>", "Meaningful only if <sched> = \"cfs\", lower and upper bound for the initial virtual runtimes, must be an array of length 2 (default: (98, 102)) Note that arrays must be written as \"1, 2\".", {
      validator: program.ARRAY,
      default: undefined
    })
    .action(({ args, options }) => {
      if (args.sched === "cfs") {
        // Invoke the generator
        let plan = cfsGenerator(
          args.tasksCount,
          options.tm,
          options.rf,
          options.lt,
          options.mg,
          options.wgup,
          _.map(options.lr as Array<String>, (s) => Number(s)),
          _.map(options.vrtr as Array<String>, (s) => Number(s)),
          options.ms,
          options.mei,
          options.mat
        );
        console.log(JSON.stringify(plan));
      } else {
        // Invoke the generator
        let plan = configurableGenerator(
          args.sched,
          args.tasksCount,
          options.tm,
          options.rf,
          options.ms,
          options.mei,
          options.mat,
          options.qt
        );
        console.log(JSON.stringify(plan));
      }
    })
    .command("simulate", "Simulate provided schedule")
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args, options }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((presched: any) => {
        // Inject the class into the object
        let class_customizable = presched.class["type"];
        if (class_customizable !== "cfs") {
          presched.class = schedClassFromString(presched.class["type"])
          // Remove useless attributes (otherwise they would get printed...)
          if(class_customizable !== "rr") {
            delete presched.attributes.quantum;
          }
        }
        return presched as Plan<any, any>;
      }).then((sched: Plan<any, any>) => {
        let sim: Schedule;
        if (sched.class.type !== "cfs") {
          sim = sims.configurable(options, sched, logger);
        } else {
          sim = sims.cfs(options, sched, logger);
        }
        console.log(JSON.stringify(sim, null, 2));
      });
    })
    .command("export", "Export simulation data to available formats")
    .argument("<artifact>", "Artifact name (one of: blank, complete, data)")
    .argument("[json]", "JSON file or stdin")
    .option("-i, --inline", "Inserts preemption and event strings inline in the exported LaTeX.")
    .action(({ logger, args, options }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sim: Schedule) => {
        console.log(exportLatex(sim, options.inline as Boolean, logger)[args.artifact + ""].code);
      });
    })
    .command("table", "Export a LaTeX table with the summary of tasks")
    .argument("<artifact>", "Artifact name (one of: blank, complete)")
    .argument("[JSON]", "JSON file or stdin")
    .action(({ logger, args }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sim: Schedule) => {
        console.log(exportLatexSummary(sim, logger)[args.artifact + ""].code);
      });
    });
    
  program.run();
};

main();

#!/usr/bin/env bun

import { program } from "@caporal/core";

import { exportLatex } from "./lib/artifacts";
import { Schedule, Plan, ScheduleProducer } from "./lib/types";

type Tests = {
  cfs: Plan<any, any>[];
};

type Simulators = {
  cfs: ScheduleProducer;
};

let tests: Tests = {
  cfs: require("./lib/cfs/fixtures").plans as Plan<any, any>[],
};

let sims: Simulators = {
  cfs: require("./lib/cfs/lib").produceSchedule as ScheduleProducer,
};

let $fs = require("mz/fs");
let $gstd = require("get-stdin");

let main = () => {
  program
    .name("aos-sched")
    .description("Create temporal diagrams of AOS realtime schedulers")
    .command("dump", "Dump out examples")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs"],
    })
    .argument("<num>", "Example number", {
      validator: program.NUMBER,
    })
    .action(({ args }) => {
      let n: number = parseInt(args.num + "");
      console.log(JSON.stringify(tests[args.sched + ""][n]));
    })
    .command("simulate", "Simulate provided schedule")
    .argument("<sched>", "Scheduler to use", {
      validator: ["cfs"],
    })
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args, options }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sched: Plan<any, any>) => {
        let sim: Schedule;
        if (args.sched === "cfs") {
          sim = sims.cfs(options, sched, logger);
          console.log(JSON.stringify(sim, null, 2));
        }
      });
    })
    .command("export", "Export simulation data to available formats")
    .argument("<artifact>", "Artifact name")
    .argument("[json]", "JSON file or stdin")
    .action(({ logger, args }) => {
      let datap = args.json ? $fs.readFile(args.json, "utf8") : $gstd();
      datap.then(JSON.parse).then((sim: Schedule) => {
        console.log(exportLatex(sim, logger)[args.artifact + ""].code);
      });
    });
  program.run();
};

main();
