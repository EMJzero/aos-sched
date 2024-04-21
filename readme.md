
# Introduction

This is a small CLI tool written for the Advanced Operating Systems course to create realtime schedule diagrams from schedule plans. It provides several commands to simulate and print scheduling simulations. At the moment, the following schedulers are implemented:

- CFS (Linux CFS)
- FIFO (First-In, First-Out)
- SJF (Shortest Job First)
- SRTF (Shortest Remaining Time First)
- RR (Round-Robin)
- HRRN (Highest Response Ratio Next)

# Installation
To install the package and use it properly, you need to link it as a Bun package, so that Bun knows where the package is and of its existence.

To install, run the following:
```
cd <path-to-repo>
bun link && bun link aos-sched
```

Now you should be able to use `bun test` to run the attached tests.

# Usage
Only usage examples are provided, add the `--help` option to any command for a full list of its arguments and options.
The available commands are:

1. `dump`: This command is used to dump out examples of schedule plans which are wired in the tool (they are the one used for tests). These might have or not parameters specific to the scheduler itself. It takes two arguments: the scheduler to use and the example number. It returns the JSON representation of the specified schedule.

    ```sh
    bunx aos-sched dump cfs 0 | jq .
    ```

    Example output:

    ```json
    {
      "timer": 0.5,
      "runfor": 8,
      "class": {
        "type": "CFS",
        "latency": 6,
        "mingran": 0.75,
        "wgup": 1
      },
      "tasks": [
        {
          "index": 0,
          "name": "$t_1$",
          "lambda": 1,
          "start": 0,
          "events": [
            8
          ],
          "vrt": 100
        },
        ...
    ```

2. `gen`: This command is used to randomly generate a new schedule plan. Reasonable default values for the generator are present, but can be chosen via the command's options. As the `dump` command, it returns the JSON representation of the specified schedule. Meaningful options vary accordingly to the chosen scheduler, refer to `gen -h` for details.

    ```sh
    # Example with "rr"
    bunx aos-sched gen rr 3 --tm 1 --rf 12 --ms 2 --mei 4 --mat 6 --qt 2
    # Example with "cfs"
    bunx aos-sched gen cfs 4 --tm 0.5 --rf 8 --ms 2 --mei 2 --mat 4 --lt 4 --mg 1 --lr "2, 5" --vrtr "6, 9"
    ```

2. `simulate`: This command is used to produce, by simulation, a realtime schedule from a schedule plan. It takes a single argument: the JSON file or stdin containing the schedule data (for examples of CFS schedules look at its [test files](./lib/cfs/fixtures.ts)). The scheduler to be used will be inferred from the data and format of the JSON schedule being passed as input to the command. It simulates the schedule using the specified scheduler and returns the JSON representation of the simulated schedule.

    ```sh
    bunx aos-sched dump cfs 0 | bunx aos-sched simulate
    ```

3. `export`: This command is used to export simulation data to available formats. It takes two arguments: the artifact name and the JSON file or stdin containing the simulation data. It exports the simulation data in the specified artifact format. At the moment there are three artifacts (`blank`, `complete`, `data`) that output latex source code.

    - `blank`: returns an empty table, with arrival times and schedule class attributes.
    - `complete`: returns a filled table with the simulation results.
    - `data`: returns a LaTeX itemize with the data required to manually simulate the schedule.

    Options:

    - `--inline` or `-i`, inserts preemption and event strings inline within the plot rather than using a legend.
    - `--nobelow` or `-n`, removes numbers below the cells, useful when they do not add meaninful insight, such for the RR and FIFO schedulers.

    ```sh
    bunx aos-sched dump cfs 0 | bunx aos-sched simulate | bunx aos-sched export complete
    ```
    ```sh
    bunx aos-sched dump rr 2 | bunx aos-sched simulate | bunx aos-sched export data
    ```

    Example output (`data`):

    ```tex
    \begin{itemize}
      \item Schedule data: type = rr, metric = time quantum, quantum = 1.5
      \item task $t_1$ (\length = 9) arrives at 0, runs for 1, waits for 5, runs for 8
      \item task $t_2$ (\length = 20) arrives at 0, runs for 14
      \item task $t_3$ (\length = 8) arrives at 0, runs for 3, waits for 2, runs for 10
    \end{itemize}
    ```

4. `table`: This command is used to export a LaTeX table summarizing the schedule plan data. It takes two arguments: the artifact name and the JSON file or stdin containing the simulation data, or alternatively the raw schedule plan. At the moment there are two artifacts (`blank`, `complete`) that output LaTeX source code, which are observed ONLY if the command is fed with full simulation data (otherwise, `blank` is generated regardless of this option). `blank` creates the table filled with arrival and computation times, while `complete` also adds start, completion, waiting times and turnaround (if the simulation did not run for enough time to let a task exit, it will not have a completion time hence no turnaround can be determined as well, and therefore these fields will remain blank).

    - `blank`: returns a table with only the initial data of the simulation.
    - `complete`: returns a table containing the solution to the simulation.

    ```sh
    # To extract a full, filled-out table
    bunx aos-sched dump cfs 0 | bunx aos-sched simulate | bunx aos-sched table complete
    ```
    ```sh
    # To extract a blank table
    bunx aos-sched dump cfs 0 | bunx aos-sched simulate | bunx aos-sched table blank
    # Or alternatively
    bunx aos-sched dump cfs 0 | bunx aos-sched table blank
    ```

# Examples
## End-to-End generation using bundled schedules
### CFS (Completely Fair Scheduler)
#### Schedule Plot
```sh
bunx aos-sched dump cfs 4 | bunx aos-sched simulate | bunx aos-sched export complete
```

will produce a latex file that when compiled and exported to png gives:

![](./static/example_cfs.png)

#### Schedule Data
```sh
bunx aos-sched dump cfs 4 | bunx aos-sched simulate | bunx aos-sched export data
```
will produce a latex file that when compiled gives the following (re-rendered to Markdown):

> Schedule Data: $\bar{\tau}$= 6, $\mu$=4, $\omega$=1
> - task $t_1$ ($\lambda = 1$) arrives at 0, runs for 1, waits for 5, runs for 8
> - task $t_2$ ($\lambda = 1$) arrives at 0, runs for 14
> - task $t_3$ ($\lambda = 1$) arrives at 0, runs for 3, waits for 1, runs for 10

#### Schedule Summary Table
```sh
bunx aos-sched dump cfs 4 | bunx aos-sched simulate | bunx aos-sched table complete
```
will produce a latex file that when compiled gives the following (re-rendered to Markdown):


> | Task | Arrival | Final VRT | Start | Finish | Waiting (W) | Turnaround (Z) |
> |------|---------|-----------|-------|--------|-------------|----------------|
> | 1    | 0       | 105       | 0     |        | 0           |                |
> | 2    | 0       | 104.5     | 1     |        | 1           |                |
> | 3    | 0       | 104       | 5     |        | 5           |                |

### RR (Round-Robin)
#### Schedule Plot
```sh
bunx aos-sched dump rr 3 | bunx aos-sched simulate | bunx aos-sched export complete
```

will produce a latex file that when compiled and exported to png gives:

![](./static/example_rr.png)

#### Schedule Data
```sh
bunx aos-sched dump rr 3 | bunx aos-sched simulate | bunx aos-sched export data
```
will produce a latex file that when compiled gives the following (re-rendered to Markdown):

> Schedule Data: **type** = *rr*, **metric** = *time quantum*, **quantum** = *1.5*
> - task $t_1$ (*length = 16*) arrives at 0, runs for 1, waits for 2, runs for 3, waits for 4, runs for 8
> - task $t_2$ (*length = 16*) arrives at 0, runs for 2, waits for 2, runs for 2, waits for 3, runs for 1
> - task $t_3$ (*length = 16*) arrives at 0, runs for 3, waits for 1, runs for 2, waits for 3, runs for 1

#### Schedule Summary Table
```sh
bunx aos-sched dump rr 3 | bunx aos-sched simulate | bunx aos-sched table complete
```
will produce a latex file that when compiled gives the following (re-rendered to Markdown):


> | Task | Arrival | Computation | Start | Finish | Waiting (W) | Turnaround (Z) |
> |------|---------|-------------|-------|--------|-------------|----------------|
> | 1    | 0       | 16          | 0     |        | 0           |                |
> | 2    | 0       | 16          | 1     | 16     | 1           | 16             |
> | 3    | 0       | 16          | 2.5   | 18.5   | 2.5         | 18.5           |


## Generate a random schedule
```sh
bunx aos-sched gen fifo 4 --tm 0.5 --rf 8 --ms 2 --mei 2 --mat 4 > tmp.json
bunx aos-sched simulate < tmp.json | bunx aos-sched export complete
bunx aos-sched table blank < tmp.json
bunx aos-sched simulate < tmp.json | bunx aos-sched table complete
```

will instead yield a randomly generated schedule and its tables, both empty and complete.
