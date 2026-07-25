window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Orientation = {
  async lockLandscape(){
    // screen.orientation.lock() is rejected by most mobile browsers unless the document is
    // already in fullscreen -- without this, the lock silently fails and the device stays in
    // its true physical (portrait) orientation, meaning any native OS UI (like a share sheet)
    // still renders portrait even though our CSS makes the page itself look landscape.
    try{
      const el=document.documentElement;
      if(!document.fullscreenElement&&el.requestFullscreen){
        await el.requestFullscreen().catch(()=>{});
      }
    }catch{}
    try{
      if(screen.orientation?.lock){
        await screen.orientation.lock("landscape");
        return true;
      }
    }catch{}
    return false;
  }
};