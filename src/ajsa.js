const CDP = require('chrome-remote-interface');
const {ChromeLauncher} = require('lighthouse/lighthouse-cli/chrome-launcher');
const cheerio = require('cheerio');
const launcher = new ChromeLauncher({
  port: 9222, // remote-debugging-port
  additionalFlags: [
    '--headless',
    '--disable-gpu'
  ]
});

launcher.run().then(() => {

  CDP(async protocol => {
    const {Page, Runtime} = protocol;

    await Page.enable();
    await Runtime.enable();

    // 画面遷移
    await Page.navigate({url: 'http://www.ajsa.jp/pro/2016pro/02_ka.html'});

    // ロードを待つ
    await Page.loadEventFired();

    // HTMLを得る
    let bodyHtml = await evaluate(() => {
      return document.body.innerHTML;
    });

    const skaters = [];
    const $ = cheerio.load(`<div>${bodyHtml}</div>`);
    $('table').each((i, table) => {
      const skater = {
        name: '',
        nameKana: '',
        birthDay: '',
        sponsors: []
      };
      const el = $(table).find('tr').find('td font');
      const text = el.text().replace(/HP or Blog/g,'');
      var arr = text.split('\n')
      var t1 = arr[0];
      skater.name = t1.replace(/\n/g,'').replace(/(（.+)/,'');
      skater.nameKana = t1.replace(/\n/g,'').replace(/^(.+)\/(\s*)(.+)(生年月日.+)/,'$3');
      skater.birthDay = t1.replace(/\n/g,'').replace(/^(.+生年月日：)(.*)(　身長.+)$/,'$2').replace('：','');

      arr.shift();
      arr.forEach(item => {
        var v = item.replace('スポンサー：','');
        v.split('/').forEach(item => {
          var v = item.replace(/\t/g,'').replace(/　/g, '').replace(/^\s|\s$/g,'');
          if(v) skater.sponsors.push(v);
        });
      });
      skaters.push(skater);
    });

    console.log(skaters);

    protocol.close();
    launcher.kill();

    async function evaluate(f) {
      const str = f.toString();
      const result = await Runtime.evaluate({expression: `(${str})()`});
      return result.result.value;
    }

  }).on('error', err => {
    throw Error('Cannot connect to Chrome:' + err);
  });
}).catch(err => {
  return launcher.kill().then(
    () => { throw err; },
    console.error
  );
});
