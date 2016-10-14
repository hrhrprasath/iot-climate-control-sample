(function(){
  var getLink = new XMLHttpRequest();
  getLink.onreadystatechange = function() {
  	if (this.readyState == 4 && this.status == 200) {
  		document.getElementById("iotlink").setAttribute("href","https://"+this.response+"/dashboard/#/devices/deviceTypes");
  	}
  };
  getLink.open("GET", "/getiotlink", true);

  getLink.responseType = "string";
  getLink.send();
})()
