const CDP = require('chrome-remote-interface');
const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher');
const file = require('fs');

const cheerio = require('cheerio');

const launcher = new ChromeLauncher({
  port: 9222, // remote-debugging-port
  additionalFlags: [
    '--headless',
    '--disable-gpu'
  ]
});
launcher.run()
  .then(() => {

    CDP(async protocol => {
      const {Page, DOM, Emulation} = protocol;

      const format = 'png';
      const defaultScreenSize = {
        width: 1440,
        height: 900,
      };

      await Page.enable();
      await Emulation.setDeviceMetricsOverride(
        Object.assign({
          deviceScaleFactor: 0,
          mobile: false,
          fitWindow: false,
        }, defaultScreenSize)
      );
      await Emulation.setVisibleSize(defaultScreenSize);
      await Page.navigate({url: 'https://www.pxgrid.com/'});
      await Page.loadEventFired();

      const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
      const {nodeId: bodyNodeId} = await DOM.querySelector({
        selector: 'body',
        nodeId: documentNodeId,
      });
      const {model: {height}} = await DOM.getBoxModel({nodeId: bodyNodeId});

      await Emulation.setVisibleSize(
        Object.assign(defaultScreenSize, {height})
      );

      await Emulation.forceViewport({x: 0, y: 0, scale: 1});

      const screenshot = await Page.captureScreenshot({format});
      const buffer = new Buffer(screenshot.data, 'base64');
      file.writeFile('dest/screen_shot.png', buffer, 'base64', function(err) {
        if (err) {
          console.error(err);
        } else {
          console.log('Screenshot saved');
        }
        protocol.close();
        launcher.kill();
      });
    }).on('error', err => {
      throw Error('Cannot connect to Chrome:' + err);
    });
  })
  .catch(err => {
    return launcher.kill().then(
      () => { throw err; },
      console.error
    );
  });

