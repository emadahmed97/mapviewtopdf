# mapviewtopdf

An application that takes the map view from a Drone Deploy Map and converts it to a pdf that is downloaded in the browser. 
NOTE: You must be the owner of the map to use this app. Otherwise the api calls will not be successful.

# Problems I ran into: No ‘Access-Control-Allow-Origin’ header is present on the requested resource.
I attempted to downolad from the tile url and convert it to a data url so that it can be converted into a pdf using the jsPdf library. I ran into
the CORS issue and tried to go around it by sending it to a server but using Node.js, the conversion of an image to dataUrl did not work. So I used
the cors anywhere api (https://cors-anywhere.herokuapp.com/) and did all the processing on the client side

# Libraries Used 
1) jsPDF - takes in dataUrl, saves as pdf, downloads to client's browser
2) jQuery

