const chalk = require("chalk");
const path = require("path");
const Rsync = require("rsync");

const TestServers = [
];

const ProductionServers = []


const deploy = (dest, env="test") => {
  return new Promise((resolve, reject) => {
    const rsync = new Rsync()
      .shell("ssh")
      .flags("avz")
      .exclude(env === 'production' ? ["*.map"] : [])
      // .source(path.resolve(__dirname, "alw_1_0.agora.io"))
      .source(path.resolve(__dirname, "./build/*"))
      .destination(dest)
      .progress()
      .quiet()
      .delete();

    rsync.execute(
      function(error, code, cmd) {
        if (error) {
          reject(error)
        }
        resolve();
      },
      function(data) {
        console.log(chalk.greenBright(data.toString()));
      },
      function(err) {
        console.log(chalk.redBright(data.toString()));
      }
    );
  });
};

const run = async () => {
  const env = process.env.NODE_ENV;
  const targetServers = env === 'production' ? ProductionServers : TestServers;
  for (let server of targetServers) {
    await deploy(server, env).then(() => {
      console.log(chalk.green(`[${server}] has been deployed.`))
    }).catch(err => {
      console.log(chalk.red(`Failed to deploy on [${server}], ${err}`))
    })
  }
  process.exit()
}

run();
