const test = require('node:test');
const assert = require('node:assert/strict');
const N = require('../www/js/native.js');

test('back: sheet first, then history, then exit', () => {
  assert.equal(N.backAction({ sheetOpen: true, stackLen: 1 }), 'closeSheet');
  assert.equal(N.backAction({ sheetOpen: true, stackLen: 3 }), 'closeSheet');
  assert.equal(N.backAction({ sheetOpen: false, stackLen: 3 }), 'back');
  assert.equal(N.backAction({ sheetOpen: false, stackLen: 1 }), 'exit');
});

test('bar style follows theme', () => {
  assert.equal(N.barStyleFor('light'), 'LIGHT'); // dark icons on a light bar
  assert.equal(N.barStyleFor('dark'), 'DARK');   // light icons on a dark bar
  assert.equal(N.barStyleFor('auto'), 'DEFAULT');
});

test('not native under Node', () => assert.equal(N.isNative(), false));

const setNavigator = v => Object.defineProperty(globalThis, 'navigator', { value: v, configurable: true, writable: true });

test('tap uses Capacitor Haptics in the app', () => {
  const calls = [];
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: o => calls.push(o) } } } };
  N.tap(1e13);
  delete global.window;
  assert.deepEqual(calls, [{ style: 'LIGHT' }]);
});

test('tap falls back to vibrate on the web and never throws', () => {
  const calls = [];
  const original = globalThis.navigator;
  global.window = {};
  setNavigator({ vibrate: ms => calls.push(ms) });
  N.tap(2e13);
  delete global.window;
  setNavigator(original);
  assert.deepEqual(calls, [10]);
  assert.doesNotThrow(() => N.tap());
});

test('a second tap within 150 ms does not buzz again', () => {
  const calls = [], t = 3e13;
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: { Haptics: { impact: o => calls.push(o) } } } };
  N.tap(t); N.tap(t + 100); N.tap(t + 300);
  delete global.window;
  assert.equal(calls.length, 2);
});

async function withPlugins(plugins, fn){
  global.window = { Capacitor: { isNativePlatform: () => true, Plugins: plugins } };
  try{ return await fn(); }finally{ delete global.window; }
}

test('writeDocument writes UTF-8 into Documents and creates the folder', async () => {
  const calls = [];
  const ok = await withPlugins({ Filesystem: { writeFile: async o => { calls.push(o); return { uri: 'file:///x' }; } } },
    () => N.writeDocument('ARK Studios/a.json', '{}'));
  assert.equal(ok, true);
  assert.deepEqual(calls, [{ path: 'ARK Studios/a.json', data: '{}', directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }]);
});
test('listDocuments returns file names', async () => {
  const names = await withPlugins({ Filesystem: { readdir: async () => ({ files: [{ name: 'a.json', type: 'file' }, { name: 'b.json' }] }) } },
    () => N.listDocuments('ARK Studios'));
  assert.deepEqual(names, ['a.json', 'b.json']);
});
test('document helpers fail soft', async () => {
  const boom = async () => { throw new Error('EACCES'); };
  assert.equal(await withPlugins({ Filesystem: { writeFile: boom } }, () => N.writeDocument('x', '')), false);
  assert.equal(await withPlugins({ Filesystem: { readdir: boom } }, () => N.listDocuments('x')), null);
  assert.equal(await withPlugins({ Filesystem: { deleteFile: boom } }, () => N.deleteDocument('x')), false);
  assert.equal(await N.writeDocument('x', ''), false);
  assert.equal(await N.listDocuments('x'), null);
});
test('onPause listens for the app going to the background', async () => {
  const events = [];
  await withPlugins({ App: { addListener: e => events.push(e) } }, async () => N.onPause(() => {}));
  assert.deepEqual(events, ['pause']);
});

function fakeLN(responses = {}){
  const calls = [];
  const names = ['cancelAll', 'createChannel', 'checkExactNotificationSetting', 'schedule', 'checkPermissions', 'requestPermissions', 'addListener'];
  const plugin = {};
  for(const n of names) plugin[n] = async (arg, fn) => {
    calls.push([n, arg, fn]);
    return responses[n] ? responses[n](arg, fn) : undefined;
  };
  return { plugin, calls };
}
test('replaceAll cancels, then schedules exact allow-while-idle alarms on the reminders channel', async () => {
  const ln = fakeLN({ checkExactNotificationSetting: () => ({ exact_alarm: 'granted' }) });
  const item = { id: 5, at: Date.UTC(2026, 10, 8, 12), title: 't', body: 'b', extra: { kind: 'summary' } };
  assert.equal(await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.replaceAll([item])), true);
  assert.equal(ln.calls[0][0], 'cancelAll');
  assert.deepEqual(ln.calls.find(c => c[0] === 'createChannel')[1], N.notifications.REMINDER_CHANNEL);
  assert.deepEqual(ln.calls.at(-1).slice(0, 2), ['schedule', { notifications: [{ id: 5, title: 't', body: 'b', extra: { kind: 'summary' },
    channelId: 'reminders', schedule: { at: new Date(item.at), allowWhileIdle: true }, isExactNotification: true }] }]);
});
test('without exact-alarm permission the plan is scheduled inexact, never prompting', async () => {
  const ln = fakeLN({ checkExactNotificationSetting: () => ({ exact_alarm: 'denied' }) });
  const item = { id: 5, at: 1e12, title: 't', body: 'b', extra: {} };
  await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.replaceAll([item]));
  assert.equal(ln.calls.at(-1)[1].notifications[0].isExactNotification, false);
  assert.deepEqual(ln.calls.map(c => c[0]), ['cancelAll', 'createChannel', 'checkExactNotificationSetting', 'schedule']);
});
test('an empty plan only cancels', async () => {
  const ln = fakeLN();
  assert.equal(await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.replaceAll([])), true);
  assert.deepEqual(ln.calls.map(c => c[0]), ['cancelAll']);
});
test('a failing schedule resolves false', async () => {
  const ln = fakeLN({ schedule: () => { throw new Error('nope'); } });
  const item = { id: 5, at: 1e12, title: 't', body: 'b', extra: {} };
  assert.equal(await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.replaceAll([item])), false);
});
test('permission and request follow the display state', async () => {
  const ln = fakeLN({ checkPermissions: () => ({ display: 'granted' }), requestPermissions: () => ({ display: 'denied' }) });
  assert.equal(await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.permission()), 'granted');
  assert.equal(await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.requestPermission()), false);
});
test('sendTest shows one notification now', async () => {
  const ln = fakeLN();
  assert.equal(await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.sendTest()), true);
  const n = ln.calls.at(-1)[1].notifications[0];
  assert.equal(n.id, 1);
  assert.equal(n.channelId, 'reminders');
  assert.deepEqual(n.extra, { kind: 'test' });
  assert.equal('schedule' in n, false);
});
test('onTap passes the notification’s extra', async () => {
  const ln = fakeLN();
  const got = [];
  await withPlugins({ LocalNotifications: ln.plugin }, () => N.notifications.onTap(x => got.push(x)));
  const [, event, handler] = ln.calls.find(c => c[0] === 'addListener');
  assert.equal(event, 'localNotificationActionPerformed');
  handler({ notification: { extra: { kind: 'rehearsal' } } });
  handler({ notification: {} });
  assert.deepEqual(got, [{ kind: 'rehearsal' }, {}]);
});
test('notifications are inert on the web', async () => {
  assert.equal(await N.notifications.permission(), 'unsupported');
  assert.equal(await N.notifications.requestPermission(), false);
  assert.equal(await N.notifications.replaceAll([{ id: 1, at: 1, title: '', body: '', extra: {} }]), false);
  assert.equal(await N.notifications.sendTest(), false);
});
