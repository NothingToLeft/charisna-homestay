import {describe,it,expect} from 'vitest';
import path from 'node:path';
import {findBrowser,startupErrorMessage} from '../tools/whatsapp-free/browser-path.mjs';
const env={ProgramFiles:'C:\\Program Files','ProgramFiles(x86)':'C:\\Program Files (x86)',LOCALAPPDATA:'C:\\Users\\QA\\AppData\\Local'};
describe('WhatsApp companion laptop browser startup',()=>{
 for(const [name,base,product,exe] of [
  ['64-bit Chrome',env.ProgramFiles,'Google\\Chrome','chrome.exe'],
  ['32-bit Chrome',env['ProgramFiles(x86)'],'Google\\Chrome','chrome.exe'],
  ['per-user Chrome',env.LOCALAPPDATA,'Google\\Chrome','chrome.exe'],
  ['system Brave',env.ProgramFiles,'BraveSoftware\\Brave-Browser','brave.exe'],
  ['per-user Brave',env.LOCALAPPDATA,'BraveSoftware\\Brave-Browser','brave.exe'],
  ['system Edge',env['ProgramFiles(x86)'],'Microsoft\\Edge','msedge.exe'],
  ['per-user Edge',env.LOCALAPPDATA,'Microsoft\\Edge','msedge.exe']
 ]) it('finds '+name,()=>{
  const target=path.win32.join(base,product,'Application',exe);
  expect(findBrowser({env,exists:candidate=>candidate===target})).toBe(target);
 });
 it('honors explicit browser configuration and reports invalid locations',()=>{
  expect(findBrowser({env:{...env,CHARISNA_CHROME_PATH:'D:\\Chrome\\chrome.exe'},exists:()=>true})).toBe('D:\\Chrome\\chrome.exe');
  expect(()=>findBrowser({env:{...env,CHARISNA_CHROME_PATH:'missing.exe'},exists:()=>false})).toThrow('CHARISNA_CHROME_PATH');
 });
 it('explains when no supported browser is installed',()=>{
  expect(()=>findBrowser({env,exists:()=>false})).toThrow('Chrome, Brave, atau Microsoft Edge');
 });
 it('retains actionable launch errors while removing long secret-like values',()=>{
  const message=startupErrorMessage(Error('Browser launch failed ENOENT '+ 'a'.repeat(64)));
  expect(message).toContain('ENOENT');expect(message).toContain('[REDACTED]');expect(message).not.toContain('a'.repeat(64));
 });
});
