# LogicLab

An educational digital logic simulator that focuses on the *temporal* behavior of circuits — setup/hold violations, clock edges, propagation delays, glitches, and race conditions.

**Live demo:** https://digitalsimulator.lovable.app

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)

## Why LogicLab?

Most logic simulators treat gates as ideal, instantaneous devices. LogicLab makes timing a first-class citizen: every component has configurable rise/fall and propagation delays, and the simulator reports setup/hold violations, race conditions, and glitches as they happen. This makes it ideal for learning how real digital systems actually behave.

## Features

- **Discrete-event simulation engine** with inertial delays and accurate clock edge handling.
- **Interactive SVG canvas** for building circuits from a palette of gates, flip-flops, and input sources.
- **Waveform viewer** with zooming, panning, and drag-and-drop signal reordering.
- **Timing analysis panel** that flags violations, races, and glitches with explanations and suggestions.
- **Custom components** — build hierarchical gates and reuse them across circuits.
- **Stimulus generation** for clocks, pulse trains, and static values (including start-high/low clocks).
- **Component properties** — tune delays, setup/hold windows, and rise/fall times in real time.
- **Save/load** circuits in the `.logiclab.json` format, designed for easy sharing and version control.

## Tech stack

- [Vite](https://vitejs.dev/) — fast build tooling
- [React 18](https://react.dev/) — UI layer
- [TypeScript](https://www.typescriptlang.org/) — type safety
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) — styling and components
- Custom SVG canvas — rendering engine
- Vitest — unit testing

## Getting started

```bash
# Clone the repository
git clone https://github.com/<your-org>/digitalsimulator.git
cd digitalsimulator

# Install dependencies
npm install

# Start the development server
npm run dev
```

The dev server will start at `http://localhost:8080` by default.

## Running tests

```bash
npm test
```

## Building for production

```bash
npm run build
```

The build output will be in `dist/` and can be served with any static host.

## Project philosophy

- **Data model / UI decoupling:** the circuit netlist is independent of its rendering, so the same circuit can be saved, loaded, and simulated without touching the canvas.
- **Netlist-first extensibility:** adding new components means updating the component definitions and simulation engine, not the renderer.
- **Functional, not flashy:** the visual design prioritizes readability and timing feedback over decorative effects.

## Out of scope

LogicLab intentionally does not model SPICE-level analog behavior, power integrity, or physical layout. It is a teaching tool for gate-level and register-transfer-level digital timing concepts.

## Contributing

Contributions are welcome. If you add a new component or simulator feature, please include a unit test in `src/test/` and update the relevant component definitions.

## License

MIT
