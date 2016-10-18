(function(){

  // Returned from the VCAP BLUEMIX_REGION environment variable
  var USSouthRegion = "ibm:yp:us-south";
  var UKRegion = "ibm:yp:eu-gb";
  var SYDRegion = "ibm:yp:au-syd";

  //building the Bluemix console URL
  var protocol = "https://";
  var consolehost = "new-console";
  var bluemixhost = "bluemix.net";
  var iot_services = "/iot/dashboard/services";

  // the regions URL as per the Bluemix
  var USSouthRegionHost = "ng";
  var UKRegionHost = "eu-gb";
  var SYDRegionHost = "au-syd";

  // make XHR call to get the bluemix region from Node to read the Bluemix region from the VCAP environment variable
  var getLink = new XMLHttpRequest();
  getLink.onreadystatechange = function() {
  	if (this.readyState == 4 && this.status == 200) {
      var bluemixregion = this.response;

      switch (bluemixregion) {
        case UKRegion:
              document.getElementById("bluemix-console-url").setAttribute("href", construct(UKRegionHost));
              break;
        case SYDRegion:
              document.getElementById("bluemix-console-url").setAttribute("href", construct(SYDRegionHost));
              break;

        case USSouthRegion:
        default:
              document.getElementById("bluemix-console-url").setAttribute("href",construct(USSouthRegionHost));

      }
  	}
  };
  getLink.open("GET", "/bluemixregion", true);

  getLink.responseType = "text";
  getLink.send();

  function construct(region) {
    return "".concat(protocol,consolehost,".",region,".",bluemixhost,iot_services);
  }

})()
