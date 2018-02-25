/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  Button,
  Alert,
  View
} from 'react-native';

import Pusher from 'pusher-js/react-native';
import RNGooglePlacePicker from 'react-native-google-place-picker';
import Geocoder from 'react-native-geocoding';
import MapView from 'react-native-maps';
import Spinner from 'react-native-loading-spinner-overlay';

import { regionFrom, getLatLonDiffInMeters } from './helpers';

Geocoder.setApiKey('AIzaSyDTP3MRTCIytInHITvjJPtQzVyL-w8dBzg');

export default class App extends Component {

  state = {
    location: null,
    error: null,
    has_spot: false,
    destination: null,
    parkadoro: null,
    origin: null,
    is_searching: false,
    has_ridden: false
  };

	constructor() {
  	super();
    this.username = 'koulis';
  	this.available_parkadoros_channel = null;
  	this.bookspot = this.bookspot.bind(this);
  	this.user_spot_channel = null;
	}


  bookspot() {

    RNGooglePlacePicker.show((response) => {
      if (response.didCancel) {
        console.log('User cancelled GooglePlacePicker');
      } else if (response.error) {
        console.log('GooglePlacePicker Error: ', response.error);
      } else {
        this.setState({
        	is_searching: true,
        	destination: response
        });

        let apo_data = {
          name: this.state.origin.name,
          latitude: this.state.location.latitude,
          longitude: this.state.location.longitude
        };

        let freeparking_data = {
          name: response.name,
          latitude: response.latitude,
          longitude: response.longitude
        };

        this.available_parkadoros_channel.trigger('client-parkadoro-request', {
          username: this.username,
          apo: apo_data,
          freeparking: freeparking_data
        });

      }
    });
  }


  _setCurrentLocation() {

  	navigator.geolocation.getCurrentPosition(
      (position) => {
        var region = regionFrom(
          position.coords.latitude, 
          position.coords.longitude, 
          position.coords.accuracy
        );
        
        Geocoder.getFromLatLng(position.coords.latitude, position.coords.longitude).then(
          (json) => {
            var address_component = json.results[0].address_components[0];
            
            this.setState({
              origin: {
                name: address_component.long_name,
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
              },
              location: region,
              destination: null,
              has_spot: false,
              has_ridden: false,
              parkadoro: null    
            });

          },
          (error) => {
            console.log('err geocoding: ', error);
          }
        );

      },
      (error) => this.setState({ error: error.message }),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 3000 },
  	);

  }

  componentDidMount() {

    this._setCurrentLocation();

    var pusher = new Pusher(481702, {
      authEndpoint: https://server-ltxtqwvblf.now.sh,
      cluster: eu,
      encrypted: true
    });
    
    this.available_parkadoros_channel = pusher.subscribe('private-available-parkadoros');

    this.user_spot_channel = pusher.subscribe('private-spot-' + this.username);

    this.user_spot_channel.bind('client-parkadoro-response', (data) => {
    	
      let passenger_response = 'no';
      if(!this.state.has_spot){
        passenger_response = 'yes';
      }

      // passenger responds to parkadoro's response
  		this.user_spot_channel.trigger('client-parkadoro-response', {
  			response: passenger_response
  		});
    });

    this.user_spot_channel.bind('client-found-parkadoro', (data) => {
  		// found parkadoro, the passenger has no say about this.
  		// once a parkadoro is found, this will be the parkadoro that's going to drive the user
  		// to their destination
  		let region = regionFrom(
  			data.location.latitude,
  			data.location.longitude,
  			data.location.accuracy 
  		);

  		this.setState({
  			has_spot: true,
  			is_searching: false,
  			location: region,
  			parkadoro: {
  			  latitude: data.location.latitude,
  			  longitude: data.location.longitude,
  			  accuracy: data.location.accuracy
  			}
  		});

  		Alert.alert(
  			"Orayt!",
  			"We found you a parkadoro. \nName: " + data.parkadoro.name + "\nCurrent location: " + data.location.name,
  			[
  			  {
  			    text: 'Sweet!'
  			  },
  			],
  			{ cancelable: false }
  		);      

    });

    this.user_spot_channel.bind('client-parkadoro-location', (data) => {
      // parkadoro location received
      let region = regionFrom(
        data.latitude,
        data.longitude,
        data.accuracy
      );

      this.setState({
        location: region,
        parkadoro: {
          latitude: data.latitude,
          longitude: data.longitude
        }
      });

    });

    this.user_spot_channel.bind('client-parkadoro-message', (data) => {
    	if(data.type == 'near_apo'){
    		//remove passenger marker
    		this.setState({
    			has_ridden: true
    		});
    	}

    	if(data.type == 'near_freeparking'){
    		this._setCurrentLocation();
    	}
    	
    	Alert.alert(
	        data.title,
	        data.msg,
	        [
	          {
	            text: 'Aye sir!'
	          },
	        ],
	        { cancelable: false }
      	);	
    });

  }

  render() {

    return (
      <View style={styles.container}>
      	<Spinner 
      		visible={this.state.is_searching} 
      		textContent={"Looking for parkadoros..."} 
      		textStyle={{color: '#FFF'}} />
        <View style={styles.header}>
          <Text style={styles.header_text}>GrabClone</Text>
        </View>
        {
          !this.state.has_spot && 
          <View style={styles.form_container}>
            <Button
              onPress={this.bookspot}
              title="Book a spot"
              color="#103D50"
            />
          </View>
        }
        
        <View style={styles.map_container}>  
        {
          this.state.origin && this.state.destination &&
          <View style={styles.origin_destination}>
            <Text style={styles.label}>Origin: </Text>
            <Text style={styles.text}>{this.state.origin.name}</Text>
           
            <Text style={styles.label}>Destination: </Text>
            <Text style={styles.text}>{this.state.destination.name}</Text>
          </View>  
        }
        {
          this.state.location &&
          <MapView
            style={styles.map}
            region={this.state.location}
          >
            {
              this.state.origin && !this.state.has_ridden &&
              <MapView.Marker
                coordinate={{
                latitude: this.state.origin.latitude, 
                longitude: this.state.origin.longitude}}
                title={"You're here"}
              />
            }
    
            {
              this.state.parkadoro &&
              <MapView.Marker
                coordinate={{
                latitude: this.state.parkadoro.latitude, 
                longitude: this.state.parkadoro.longitude}}
                title={"You have arrived"}
                pinColor={"#4CDB00"}
              />
            }
          </MapView>
        }
        </View>
      </View>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end'
  },
  form_container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  header: {
    padding: 20,
    backgroundColor: '#333',
  },
  header_text: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold'
  },  
  origin_destination: {
    alignItems: 'center',
    padding: 10
  },
  label: {
    fontSize: 18
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  map_container: {
    flex: 9
  },
  map: {
   flex: 1
  },
});spot