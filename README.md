# Cloud Connect
Powerful cloud-oriented client allow you to connect to various instances and applications via secure (SSH) tunnel & RDP

# Demo
<div style="text-align:center"><img src="https://raw.githubusercontent.com/sanketbajoria/cloudconnect/master/example/cloudconnectoptimize.gif" width="850" height="425" title="Basic Demo" /></div>


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
