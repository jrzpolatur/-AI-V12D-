const esbuild = require("esbuild");
(async () => {
  await esbuild.build({
    entryPoints: ["src/game/engine.ts"],
    bundle: true,
    format: "esm",
    platform: "node",
    plugins: [{
      name: "stub-worker",
      setup(build) {
        build.onResolve({ filter: /ai\.worker\.ts/ }, (args) => ({
          path: args.path,
          namespace: "worker-stub",
        }));
        build.onLoad({ filter: /.*/, namespace: "worker-stub" }, () => ({
          contents: "export default class DummyWorker { postMessage() {} terminate() {} addEventListener() {} removeEventListener() {} }",
          loader: "ts",
        }));
      },
    }],
    outfile: "server/engine.bundle.mjs",
    logLevel: "warning",
  });
  console.log("built server/engine.bundle.mjs successfully");
})();
