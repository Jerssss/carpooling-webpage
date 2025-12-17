# 9467_IT312-TeamArc_MidtermProject


## Name
CARMA - A Carpooling Web Application for SLU Maryheights Students

## Description
A working carpool booking system with three modules: admin, passenger, and driver. Its core features include a robust booking system integrated with Google maps API

## Badges
N/A

## Visuals
N/A

## Installation
Since we made use of MongoDB NoSQL, which isn't a built in feature of PHP, there is a specific setup that needs to be followed in order for the web application to be tested on one's end.

NOTE: THIS IS APPLIED TO WHEN WAMP IS THE ONE USED AS THE SIMULATED SERVER ENVIRONMENT

Software that must be installed:
1. MongoDB Compass
2. WAMP Server
3. Composer (Download link: https://getcomposer.org/download/)
4. MongoDB PHP Driver (Download link : https://pecl.php.net/package/mongodb)
5. Node JS 

MongoDB Compass Database Setup
1. Ensure that the connection string used the default port (Connection String : mongodb://localhost:27017/)
2. Within the connection, there must be a database named as : carpooling_data
3. Within the carpooling_data database, the following collections must be named:
    - bookings
    - complaints
    - history
    - notifications
    - payments
    - reviews
    - rides
    - users
    - vehicles
    (In the submission bin, we have included the json/collections files to be exported in the said collections)

WAMP Setup
1. This project must be placed in the www folder of the WAMP64 directory
2. Open the project in Visual Studio Code from there

Composer Setup
1. Simply download composer through the download link : https://getcomposer.org/download/
2. Follow the installation steps through there
3. In the case where you get stopped by an error such as PHP not being found, follow these steps:
    - Open your wamp folder
    - Go to bin
    - Go to PHP
    - Select PHP version 8.4.0
    - Copy the file path
    - Open environment variables
    - Paste the filepath on to "Path" on both user variables and environtment variables
    - Move up
4. In the case where an error "dll not found" still persists:
    - Open your wamp folder
    - Go to bin
    - Go to PHP
    - PHP version 8.4.0
    - Look for the php.ini file
    - CTRL + F and search this line "zend_extension="E:/wamp64/bin/php/php8.4.0/zend_ext/php_xdebug-3.4.0beta1-8.4-x86_64.dll" "
        - If this can't be found, simply search "zend_extension" and look for a similar looking line
    - Once found, comment it out by adding a semicolon ; at the start of the line 
    (;E:/wamp64/bin/php/php8.4.0/zend_ext/php_xdebug-3.4.0beta1-8.4-x86_64.dll)
    - Save the php.ini file

    JUST TO BE SAFE (Also edit your php.ini in your Apache file)
    - Open your wamp folder
    - Go to bin
    - Go to Apache
    - Apache version 2.4.62.1
    - Look for the php.ini file
    - CTRL + F and search this line "zend_extension="E:/wamp64/bin/php/php8.4.0/zend_ext/php_xdebug-3.4.0beta1-8.4-x86_64.dll" "
        - If this can't be found, simply search "zend_extension" and look for a similar looking line
    - Once found, comment it out by adding a semicolon ; at the start of the line 
    (;E:/wamp64/bin/php/php8.4.0/zend_ext/php_xdebug-3.4.0beta1-8.4-x86_64.dll)
    - Save the php.ini file


PHP MongoDB Driver Setup
1. Install the PHP MongoDB Driver through this link : https://pecl.php.net/package/mongodb
2. Under "Available Releases", click on the DLL hyperlink of mongodb-2.1.4.tgz
3. Under "DLL list", click on the download link that is suited to your PC. In our case, we downloaded 8.4 Thread Safe (TS) x64
4. A zip file should download. Once downloaded, extract the zip file
5. Open the extracted zip file and copy "php_mongodb.dll"
6. Open your wamp64 folder and do the following steps:
    - Go to bin
    - Go to PHP
    - PHP version 8.4.0
    - Go to "ext" folder and paste the .dll file inside

The next step is to enable the MongoDB extension:
    - If you are still inside the ext folder, simply go back 
    - Look for php.ini file and open it
    - CTRL + F Search for "extension"
    - Look for this header:
    ;;;;;;;;;;;;;;;;;;;;;;
    ; Dynamic Extensions ;
    ;;;;;;;;;;;;;;;;;;;;;;
    - Go to the bottom of ALL the extensions written there and type this "extension=mongodb"
    - Save the file

JUST TO BE SAFE, also repeat this process in the Apache folder
   - Open your wamp folder
    - Go to bin
    - Go to Apache
    - Apache version 2.4.62.1
    - Look for the php.ini file
    - Look for this header:
    ;;;;;;;;;;;;;;;;;;;;;;
    ; Dynamic Extensions ;
    ;;;;;;;;;;;;;;;;;;;;;;
    - Go to the bottom of ALL the extensions written there and type this "extension=mongodb"
    - Save the file
    - Save the php file

## Quick WAMP MongoDB Setup (Concise)
1) Install Composer and MongoDB driver
    - Install Composer from https://getcomposer.org/download/
    - Download `php_mongodb.dll` matching your PHP (x64, Thread Safe) from https://pecl.php.net/package/mongodb

2) Copy the driver DLL
    - Place `php_mongodb.dll` into `wamp64/bin/php/<your-php-version>/ext/`

3) Enable the extension in php.ini
    - Edit `wamp64/bin/php/<your-php-version>/php.ini`
    - Under Dynamic Extensions, add: `extension=mongodb`
    - Also add the same line in `wamp64/bin/apache/<your-apache-version>/bin/php.ini` if present

4) Restart WAMP services
    - Restart all services from the WAMP tray icon

5) Verify installation
    - Create a `phpinfo()` page under `www` or visit an existing PHP page
    - Confirm section `mongodb` appears

6) Install PHP library via Composer
    - Open terminal in the project root and run:
      - `composer install`
      - If already installed, `composer dump-autoload -o`

7) Test DB connectivity
    - Visit `http://localhost/9467_it312-teamarc_midtermproject/includes/test_mongo_connection.php`
    - You should see a successful connection response

8) Common fixes
    - If you see a missing DLL error, ensure the correct VC runtime is installed and that `ext` path matches your PHP version
    - If Composer can’t find PHP, add `wamp64/bin/php/<your-php-version>` to your PATH (User and System)


# NODE JS SETUP
Node JS is used as the server side scripting language of the admin module. Hence in order to run the admin module, you need to
setup the Node JS and use express along with it.

Installation steps:
1. If not yet installed, download NodeJS for your PC
Link: https://nodejs.org/

2. After installing, verify if it is downloaded
node -v
npm -v

3. Within this visual studio code folder, open a terminal and initialize Node JS
    npm init -y
        - This will create the package.json file

4. Install Express and MongoDB driver
    npm install express mongodb dotenv cors
        - This will install express, mongodb, dotenv, and cors

5. In the repository, a server.js file has already been created, but you still need to create a .env file. Create the .env file within the admin-side module. Inside it, paste this code:

MONGO_URI=mongodb://localhost:27017

6. If all has been setup properly, the NodeJS server must be ran to test the functionality of the admin module


Actually Testing the Project
- Once all the previous setups are done, open wamp server and connect to MongoDB
- Just to be safe, be sure that there is a vendor folder in the project. If none, open the terminal and write "composer install"

## Usage
- This project cannot be run directly in visual studio code, and needs to be run by searching the URL in your browser.
If the previous steps have been completed, search this:
http://localhost/9467_it312-teamarc_midtermproject/login.html

Test credentials:
PASSENGER
email: 2238459@slu.edu.ph
password: 123

DRIVER
email: mtcorpuz@slu.edu.ph
password: 123

BOTH
email: 2236712@slu.edu.ph
password: 123

OR you can test the register module, and use the admin to approve the registration for the profile

# Admin testing
Admin testing
1. Open terminal
2. Enter these commands
    cd admin-side
    node server.js
3. You should now be able to test the admin. Make use of these test credentials:
    email: admin1@slu.edu.ph
    password: admin123

Localhost testing: http://localhost/9467_it312-teamarc_midtermproject/login.html


Now, in the WAMP environment, it is possible to allow other PCs to connect to the WAMP server. If you want to use a different machine for testing, follow these steps

# Allowing multiple client connections through WAMP
1. Allow Apache to Accept External Connections
    Open and run WAMP
    Click on the WAMP icon in the taskbar
    Click on Apache
    Click on httpd.conf
    Look for Listen 80. Ensure that it is not commented out

    Look for the <Directory> block. Look specifically for:
    <Directory "c:/wamp/www/">
        AllowOverride All
        Require local
    </Directory>

    Change Require local to Require all granted

2. EDIT HTTPD-VHOSTS.CONF FILE
    Also edit the httpd-vhosts.conf file. This is what it should look like:

    # Virtual Hosts
    <VirtualHost _default_:80>
    ServerName localhost
    ServerAlias localhost
    DocumentRoot "${INSTALL_DIR}/www"
    <Directory "${INSTALL_DIR}/www/">
    Options +Indexes +Includes +FollowSymLinks +MultiViews
    AllowOverride All
    Require all granted
    </Directory>
    </VirtualHost>

3. Allow Apache Through Windows Firewall
    Open Windows Defender Firewall
    Click Allow an app or feature through Windows Defender Firewall
    Click Change settings, then Allow another app
    Find and add: httpd.exe and wampmanager.exe (browse these files in your wamp folder)
    Private network must be checked for both

4. Restart WAMP

5. Test the connection in another PC 
Use this URL format
http://192.x.xx.xxx/9467_it312-teamarc_midtermproject/login.html

Change the ip address based on the server PC’s ipconfig IPV4 address



## Authors and acknowledgment
- Adame, Noelle Lorraine
- Ang-angco, Jeremiah
- Ferrer, Geoff Denuel
- Grabanzor, Giana Kristy
- Molina, Bernard Sebasthian
- Terre, Jorge Frederic

## License
N/A

## Project status
TO BE FURTHER POLISHED