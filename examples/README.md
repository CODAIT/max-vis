# Examples

This folder contains browser, Node.js, and command-line examples of using `max-vis`.
Follow the steps below to install and run the browser, Node.js, or command-line example.

Open a terminal and run the commands:

1. Clone this repository  
    ```
    $ git clone https://github.com/CODAIT/max-vis
    ```
    
1. Change directory to the cloned repository directory  
    ```
    $ cd max-vis
    ```
    
1. Install the dependencies  
    ```
    npm install
    ```
    
1. Build the package  
    ```
    npm run build
    ```
    
1. Continue with the **[Browser](#Browser)**, **[Node.js](#Node.js)**, or **[Command-line](#Command-line)** steps below.  

## Browser

For the browser example, continue with a locally installed web server:

1. Point a web server to the root of the cloned repository directory (i.e, `/max-vis`)

    > For example: 
    >  
    > - using the **[Web Server for Chrome](https://github.com/kzahel/web-server-chrome)** extension (install it from the [Chrome Web Store](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb))
    >   
    >   1. Go to your Chrome browser's Apps page ([chrome://apps](chrome://apps))
    >   1. Click on the **Web Server**
    >   1. From the Web Server, click **CHOOSE FOLDER** and browse to the `max-vis` cloned repository directory
    >   1. Start the Web Server
    >   1. Make note of the **Web Server URL(s)** (e.g., http://127.0.0.1:8080)
    >   
    > - using the Python **HTTP server** module
    >   
    >   1. From a terminal shell, go to the `max-vis` cloned repository directory
    >   1. Depending on your Python version, enter one of the following commands:
    >       - Python 2.x: `python -m SimpleHTTPServer 8080`
    >       - Python 3.x: `python -m http.server 8080`
    >   1. Once started, the Web Server URL should be http://127.0.0.1:8080
    >   

1. Open a browser and access `examples/browser.html` via the Web Server's (e.g., http://127.0.0.1:8080/examples/browser.html)

1. In the web app, click the upload button and choose an image to process  

> **Note**: _The browser example uses the [@codait/max-image-segmenter](https://www.npmjs.com/package/@codait/max-image-segmenter) to assign each pixel in an image to a particular object._

## Node.js

For the Node.js example, continue in the terminal shell with the following commands:

1. Install the `form-data` package  
    ```
    npm install --no-save form-data
    ```
    
1. Use `node` to run the `examples/app.js` and pass to it a path to an image to process  
    ```
    node examples/app.js path/to/image/file.jpg
    ```

> **Note**: _The Node.js example uses a hosted evaluation instance of the [MAX Object Detector](https://github.com/IBM/MAX-Object-Detector) to identify objects in an image._  

## Command-line

For the command-line example, continue in the terminal shell with the following commands:

1. Run the script and pass it a path to an image to process
    ```
    ./examples/cli.sh path/to/image/file.jpg
    ```  

> **Note**: _The command-line example uses a hosted evaluation instance of the [MAX Object Detector](https://github.com/IBM/MAX-Object-Detector) to identify objects in an image._  
