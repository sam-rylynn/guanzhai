import {detectRegions} from './recognition.js?v=b1cae4b4be94';
// Entirely browser-local: this worker never makes API or image-upload requests.
self.onmessage=event=>{
 try{self.postMessage({result:detectRegions(event.data.image,event.data.options)});}
 catch(err){self.postMessage({error:err.message||'这张图暂时无法识别，请换清晰线稿或手动勾画。'});}
};
