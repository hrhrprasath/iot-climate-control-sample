# IoT Climate Control Sample
IoT reference sample for Climate Control

## Deploy the app on Bluemix
You can deploy your own instance to Bluemix.
To do this, you can either use the _Deploy to Bluemix_ button for an automated deployment or follow the steps below to create and deploy your app manually.

### Using the Deploy to Bluemix button.
Use the *"Deploy to Bluemix"* button below, to deploy this app to Bluemix using IBM DevOps.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-watson-iot/iot-climate-control-sample.git)

### Manually deploying to Bluemix.

1. Create a Bluemix Account.

  [Sign up][bluemix_signup_url] for Bluemix, or use an existing account.

2. Download and install the [Cloud-foundry CLI][cloud_foundry_url] tool.

3. Clone the app to your local environment from your terminal using the following command:

  ```
  git clone https://github.com/ibm-watson-iot/iot-climate-control-sample.git
  ```

4. `cd` into this newly created directory.

5. Edit the `manifest.yml` file and change the `<name>` and `<host>` to something unique.

  ```
  applications:
  - path: .
    memory: 768M
    instances: 1
    domain: mybluemix.net
    name: node-js-1234
  # host: node-js-1234
    disk_quota: 1024M
  ```
  The host you use will determinate your application URL initially, for example, `<host>.mybluemix.net`.

6. Connect to Bluemix in the command line tool and follow the prompts to log in:

  ```
  $ cf api https://api.ng.bluemix.net
  $ cf login
  ```

7. Push the app to Bluemix.

  ```
  $ cf push
  ```

You now have your own instance of the app running on Bluemix.  



## Useful links
[Install Node.js]: https://nodejs.org/en/download/
[bluemix_dashboard_url]: https://console.ng.bluemix.net/dashboard/
[bluemix_signup_url]: https://console.ng.bluemix.net/registration/
[cloud_foundry_url]: https://github.com/cloudfoundry/cli

[IBM Bluemix](https://bluemix.net/)  
[IBM Bluemix Documentation](https://www.ng.bluemix.net/docs/)  
[IBM Bluemix Developers Community](http://developer.ibm.com/bluemix)  
[IBM Watson Internet of Things](http://www.ibm.com/internet-of-things/)  
[IBM Watson IoT Platform](http://www.ibm.com/internet-of-things/iot-solutions/watson-iot-platform/)   
[IBM Watson IoT Platform Developers Community](https://developer.ibm.com/iotplatform/)
