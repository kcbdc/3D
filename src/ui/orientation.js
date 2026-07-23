window.KOMSCO = window.KOMSCO || {};
window.KOMSCO.Orientation = {
  async lockLandscape(){
    try{
      if(screen.orientation?.lock){
        await screen.orientation.lock("landscape");
        return true;
      }
    }catch{}
    return false;
  }
};