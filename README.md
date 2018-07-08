# Cloud Connect
Powerful cloud aware client allow you to connect to various instances and applications such as SSH, SFTP, RDP and Docker

<div style="text-align:center"><img src="https://raw.githubusercontent.com/sanketbajoria/cloudconnect/master/example/cloudconnectoptimize.gif" width="850" height="425" title="Basic Demo" /></div>

It can also share applications with other in secure manner, <b>without revealing real credential</b>

# Motivation
I really wanted a single client to connect all cloud profiles such as AWS, Google cloud, Azure etc.. And, help to me, connect to any application with a single click.

# Features
- Segregate instances under different profiles and workspaces for better management
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
