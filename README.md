# 9467_IT312-TeamArc_MidtermProject

Skip to Line 56 for project setup


## Getting started

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

- [ ] [Create](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#create-a-file) or [upload](https://docs.gitlab.com/ee/user/project/repository/web_editor.html#upload-a-file) files
- [ ] [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/dnuel18/9467_it312-teamarc_midtermproject.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

- [ ] [Set up project integrations](https://gitlab.com/dnuel18/9467_it312-teamarc_midtermproject/-/settings/integrations)

## Collaborate with your team

- [ ] [Invite team members and collaborators](https://docs.gitlab.com/ee/user/project/members/)
- [ ] [Create a new merge request](https://docs.gitlab.com/ee/user/project/merge_requests/creating_merge_requests.html)
- [ ] [Automatically close issues from merge requests](https://docs.gitlab.com/ee/user/project/issues/managing_issues.html#closing-issues-automatically)
- [ ] [Enable merge request approvals](https://docs.gitlab.com/ee/user/project/merge_requests/approvals/)
- [ ] [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

- [ ] [Get started with GitLab CI/CD](https://docs.gitlab.com/ee/ci/quick_start/)
- [ ] [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/ee/user/application_security/sast/)
- [ ] [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/ee/topics/autodevops/requirements.html)
- [ ] [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/ee/user/clusters/agent/)
- [ ] [Set up protected environments](https://docs.gitlab.com/ee/ci/environments/protected_environments.html)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
CARMA - A Carpooling Web Application for SLU Maryheights Students

## Description
Current web application features include the following: Displaying the list of available car pools (Retrieved from the MongoDB database using PHP), Viewing a car pool and reading its pertinent information (Also retrieved from MongoDB using PHP), Booking a car pool, getting redirected to a payment section and injecting the transaction details into the MongoDB database.
Tech Stack includes: vanilla HTML and CSS, JavaScript, PHP (VERSION 8.4.0), MongoDB Compass, WAMP server, and DOM API

## Badges
N/A

## Visuals
N/A

## Installation
Since we made use of MongoDB NoSQL, which isn't a built in feature of PHP, there is a specific setup that needs to be followed in order for the web application to be tested on one's end.

Software that must be installed:
1. MongoDB Compass
2. WAMP Server
3. Composer (Download link: https://getcomposer.org/download/)
4. MongoDB PHP Driver (Download link : https://pecl.php.net/package/mongodb)

MongoDB Compass Database Setup
1. Ensure that the connection string used the default port (Connection String : mongodb://localhost:27017/)
2. Within the connection, there must be a database named as : carpooling_data
3. Within the carpooling_data database, the following collections must be named:
    - bookings
    - history
    - notifications
    - payments
    - reviews
    - rides
    - users
    - vehicles
    (In the submission bin, we have included the json files to be exported in the said collections)

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
    - Visit `http://localhost/9467_it312-teamarc_midtermproject/passenger-side/includes/test_mongo_connection.php`
    - You should see a successful connection response

8) Common fixes
    - If you see a missing DLL error, ensure the correct VC runtime is installed and that `ext` path matches your PHP version
    - If Composer can’t find PHP, add `wamp64/bin/php/<your-php-version>` to your PATH (User and System)


Actually Testing the Project
- Once all the previous setups are done, open wamp server and connect to MongoDB
- Just to be safe, be sure that there is a vendor folder in the project. If none, open the terminal and write "composer install"

## Usage
- This project cannot be run directly in visual studio code, and needs to be run by searching the URL in your browser.
If the previous steps have been completed, search this:
http://localhost/9467_it312-teamarc_midtermproject/index.html

- Bugs may occur. In the case of events where the "View" button disappears, reload the page or open a new browser window and search the URL again
- In the case where no data suddenly loads, keep reloading the page
- If no data really loads, test the php file to see if data is actually being retrieved from the database:
http://localhost/9467_it312-teamarc_midtermproject/includes/fetch_carpool.php
    - If an error is shown instead of the JSON file, review the previous setup steps again


## Support
N/A

## Roadmap
N/A

## Contributing
N/A

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