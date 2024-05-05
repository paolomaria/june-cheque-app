![Cesium logo](https://github.com/duniter/cesium/raw/master/www/img/logo_144px.png)

# June-Cheque-App

June-Cheque-App is a web application where you can easily cash cheques created by the [June-Cheque](https://github.com/paolomaria/june-cheque) project.

It has been copied from the [Cesium](https://github.com/duniter/cesium) project and the not needed parts have been removed.

It can be built like described in the [Cesium](https://github.com/duniter/cesium) project.

Only the unhosted web application package has been tested.

**IMPORTANT**: this project is still experimental. Use it at your own risk !!

## Build

After checking out the project, got to the june-cheque-app directory and call:
```
nvm use 16
npm install -g yarn 
yarn
```

Once build, you can start the application via:
```
yarn run start
```

## Install

Once built, you can create a compressed ZIP artifact with:
```
gulp webBuild --release
```
A ZIP archive will be visible dist/web/build/june-cheque-app-vx.y.z.zip.

In order to publish it, decompress the web archive, then open the ìndex.html file in your web browser.

## Donate

Every donation is very welcome. You can transfer some Junes to the following public key: `Bv8hAiQAvKWUhRgGtYBzEV2ig8ARqUvXHkD5wq4XrWiN:J1s`

To help the Cesium Team developers with a donation, use the [Cesium Team Ğ1 account](https://demo.cesium.app#/app/wot/CitdnuQgZ45tNFCagay7Wh12gwwHM8VLej1sWmfHWnQX/) (public key: `CitdnuQgZ45tNFCagay7Wh12gwwHM8VLej1sWmfHWnQX`) 

## License

This software is distributed under [GNU AGPL-3.0](https://raw.github.com/duniter/cesium/master/LICENSE).

Please read also our [privacy policy](./doc/privacy_policy.md).