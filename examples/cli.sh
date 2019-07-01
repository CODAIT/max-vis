#!/bin/bash

echo ""
echo "running version" $(node bin/max-vis-cli.js --version)

if [[ $# -eq 0 ]]
  then
    echo "Please provide path to an image file"
    echo ""
    exit 1

else

  IMAGEFILE=$1
  ENDPOINT="http://max-object-detector.max.us-south.containers.appdomain.cloud/model/predict?threshold=0.7"

  echo "command"
  echo "  curl -X POST $ENDPOINT -F \"image=@$IMAGEFILE\" | maxvis $IMAGEFILE"

  curl -X POST $ENDPOINT -F "image=@$IMAGEFILE" | node bin/max-vis-cli.js $IMAGEFILE

  echo ""
fi
