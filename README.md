# Cloud Connect
Powerful cloud-oriented client allow you to connect to various instances and applications via secure (SSH) tunnel & RDP

# Demo
<img src="https://cloud.githubusercontent.com/assets/2969587/19343848/8d8e405c-9155-11e6-8106-c32896b6be47.jpg" width="720" height="375" title="Basic Demo" />


# Features
- Ability to connect with AWS
- Connect to applications such as SSH, Scullog, Docker Machine, RDP & any custom Http/Https application
- Create a forward and reverse tunnel
- Share application safely with other, without sharing any connection detail of real instances
- Secure workspace with strong encryption


# Installation
Install from dist folder, contains windows build 

or

```sh
  git clone https://github.com/sanketbajoria/cloudconnect.git
  yarn install
  gulp build
  gulp start
```

# RoadMap
- Support for Azure and Google Compute Engine
- Import, Export, Edit, Delete workspace
- Ability to do health check for various instances and application.
- Run as service mode
- Add ability to switch from ssh mode to sftp mode in scullog (Improve performance of scullog with ssh)
- Make build for other environment (linux and Mac). Reduce build size

# License
Released under the MIT license.
