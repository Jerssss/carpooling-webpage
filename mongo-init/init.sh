#!/bin/bash
echo "Starting MongoDB import..."

mongoimport --db carpooling_data --collection history        --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.history.json        --jsonArray
mongoimport --db carpooling_data --collection rides          --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.rides.json          --jsonArray
mongoimport --db carpooling_data --collection users          --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.users.json          --jsonArray
mongoimport --db carpooling_data --collection vehicles       --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.vehicles.json       --jsonArray
mongoimport --db carpooling_data --collection bookings       --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.bookings.json       --jsonArray
mongoimport --db carpooling_data --collection notifications  --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.notifications.json  --jsonArray
mongoimport --db carpooling_data --collection payments       --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.payments.json       --jsonArray
mongoimport --db carpooling_data --collection reviews        --file /docker-entrypoint-initdb.d/carpool_db/carpooling_data.reviews.json        --jsonArray

echo "MongoDB import completed."

