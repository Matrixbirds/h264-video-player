let enabled = false;
const _prefix = "[Agora H264 Decoder] ";

export default {
  enableLog: () =>  {
    enabled = true;
  },
  error: (args) =>{
    enabled && console.log(_prefix, args);
  },
  warn: (args) => {
    enabled && console.warn(_prefix, args);
  },
  log: (args) => {
    enabled && console.log(_prefix, args);
  },
  info: (args) => {
    enabled && console.info(_prefix, args);
  },
  trace: () => {
    console.trace();
  }
}