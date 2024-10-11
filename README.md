# Another Compatible Solution For H264 Video Player
## AKA: ACSFHVP
A WebAssembly NALu Decoder Compatible Solution for WebRTC video player upon Broadwayjs

## Setup
### Requirements
1.  NodeJS LTS
2.  Npm Installer
3.  WebSocket NALu server provide WebRTC RTP Data, need config server addresss [here](./scripts/plugins.js)

### Config Your WebSocket NALu Server Address
```javascript
/**
 * line: https://vscode.dev/github/Matrixbirds/h264-video-player/blob/main/scripts/plugins.js#L39
 */
new webpack.DefinePlugin({
    // simple nalu websocket gateway 
    $WEBSOCKET_URL: NODE_ENV === 'production' ? `'wss://your-production-domain?uid=$uid&cmd=subscribe'` : `'ws://your-test-domain?uid=$uid&cmd=subscribe'`
})
```

### Install
```bash
npm install
```

### Dev
```bash
npm run dev
```

### Build
```bash
npm run build
```