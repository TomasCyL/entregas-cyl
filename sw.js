// Al hacer clic en el ícono: enfoca la pestaña de la app si ya está abierta, si no la abre.
const URL_APP = chrome.runtime.getURL('index.html');
chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: URL_APP + '*' });
  if (tabs.length) { await chrome.tabs.update(tabs[0].id, { active: true }); await chrome.windows.update(tabs[0].windowId, { focused: true }); }
  else chrome.tabs.create({ url: URL_APP });
});
