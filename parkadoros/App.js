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
  View,
  Alert
} from 'react-native';

import Pusher from 'pusher-js/react-native';
  import MapView from 'react-native-maps';

import Geocoder from 'react-native-geocoding';
  Geocoder.setApiKey('AIzaSyDTP3MRTCIytInHITvjJPtQzVyL-w8dBzg');

export default class grabparkadoro extends Component {
  state = {
    odigos: null,
    region: null,
    accuracy: null,
    nearby_alert: false,
    has_odigos: false,
    has_ridden: false
  }

  constructor() {
    super();

    this.available_parkadoros_channel = null; 
    this.park_channel = null;    
    this.pusher = null;

    console.ignoredYellowBox = [
      'Setting a timer'
    ];
  }


  componentWillMount() {

    this.pusher = new Pusher(481702, {
      authEndpoint: https://server-ltxtqwvblf.now.sh,
      cluster: eu,
      encrypted: true
    });

    this.available_parkadoros_channel = this.pusher.subscribe('private-available-parkadoros');

    this.available_parkadoros_channel.bind('client-parkadoro-request', (odigos_data) => {
      
      if(!this.state.has_odigos){

        Alert.alert(
          "You got a odigos!",
          "spot: " + odigos_data.spot.name + "\nDrop off: " + odigos_data.freeparking.name,
          [
            {
              text: "Sorry Koumpare", 
              onPress: () => {
                console.log('Cancel Pressed');
              },
              style: 'cancel'
            },
            {
              text: 'Eginen!', 
              onPress: () => {
                
                this.park_channel = this.pusher.subscribe('private-park-' + odigos_data.username);
                this.park_channel.bind('pusher:subscription_succeeded', () => {
                 
                  this.park_channel.trigger('client-parkadoro-response', {
                    response: 'yes'
                  });

                  this.park_channel.bind('client-parkadoro-response', (parkadoro_response) => {
                    
                    if(parkadoro_response.response == 'yes'){

                      this.setState({
                        has_odigos: true,
                        odigos: {
                          username: odigos_data.username,
                          spot: odigos_data.spot,
                          freeparking: odigos_data.freeparking
                        }
                      });

                      Geocoder.getFromLatLng(this.state.region.latitude, this.state.region.longitude).then(
                        (json) => {
                          var address_component = json.results[0].address_components[0];
                          
                          this.park_channel.trigger('client-found-parkadoro', { 
                            parkadoro: {
                              name: 'John Smith'
                            },
                            location: {
                              name: address_component.long_name,
                              latitude: this.state.region.latitude,
                              longitude: this.state.region.longitude,
                              accuracy: this.state.accuracy
                            }
                          });

                        },
                        (error) => {
                          console.log('err geocoding: ', error);
                        }
                      );  

                    }else{
                      
                      Alert.alert(
                        "Argises!",
                        "Efien sou toutos!",
                        [
                          {
                            text: 'Ok'
                          },
                        ],
                        { cancelable: false }
                      );
                    }

                  });

                });

              }
            },
          ],
          { cancelable: false }
        );
      }

    });
  }


  componentDidMount() {

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
       
        var region = regionFrom(
          position.coords.latitude, 
          position.coords.longitude, 
          position.coords.accuracy
        );
       
        this.setState({
          region: region,
          accuracy: position.coords.accuracy
        });

        if(this.state.has_odigos && this.state.odigos){
          
          var diff_in_meter_spot = getLatLonDiffInMeters(
            position.coords.latitude, position.coords.longitude, 
            this.state.odigos.spot.latitude, this.state.odigos.spot.longitude);

          if(diff_in_meter_spot <= 20){
            
            if(!this.state.has_ridden){
              
              this.park_channel.trigger('client-parkadoro-message', {
                type: 'near_spot',
                title: 'Just a heads up',
                msg: 'Eton dame, eftases!'
              });

              this.setState({
                has_ridden: true
              });

            }

          }else if(diff_in_meter_spot <= 50){

            if(!this.state.nearby_alert){

              this.setState({
                nearby_alert: true
              });

              Alert.alert(
                "Slow down",
                "Ekontepses!",
                [
                  {
                    text: 'Gotcha!'
                  },
                ],
                { cancelable: false }
              );

            }
          
          }

          var diff_in_meter_freeparking = getLatLonDiffInMeters(
            position.coords.latitude, position.coords.longitude, 
            this.state.odigos.freeparking.latitude, this.state.odigos.freeparking.longitude);

          if(diff_in_meter_freeparking <= 20){
            this.park_channel.trigger('client-parkadoro-message', {
              type: 'near_freeparking',
              title: "Brace yourself",
              msg: "You're very close to your destination. Please prepare your payment. Powered by Bank of Cyprus"
            });

            this.park_channel.unbind('client-parkadoro-response');
            this.pusher.unsubscribe('private-park-' + this.state.odigos.username);

            this.setState({
              odigos: null,
              has_odigos: false,
              has_ridden: false
            });

          }

          this.park_channel.trigger('client-parkadoro-location', { 
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });

        }

      },
      (error) => this.setState({ error: error.message }),
      { 
        enableHighAccuracy: true, timeout: 20000, maximumAge: 1000, distanceFilter: 10 
      },
    );
  }


  componentWillUnmount() {
    navigator.geolocation.clearWatch(this.watchId);
  }


  render() {
    return (
      <View style={styles.container}>
        {
          this.state.region && 
          <MapView
            style={styles.map}
            region={this.state.region}
          >
              <MapView.Marker
                coordinate={{
                latitude: this.state.region.latitude, 
                longitude: this.state.region.longitude}}
                title={"You're here"}
              />
              
              {
                this.state.odigos && !this.state.has_ridden && 
                <MapView.Marker
                  coordinate={{
                  latitude: this.state.odigos.spot.latitude, 
                  longitude: this.state.odigos.spot.longitude}}
                  title={"Your odigos is here"}
                  pinColor={"#4CDB00"}
                />
              }
          </MapView>
        }
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});
