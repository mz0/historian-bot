```
pm2 startup
[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command: sudo ...

export P0=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/bin
sudo env PATH=$P0 /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u mz0 --hp /home/mz0

pm2 start bot.js

ss -lnp |grep 9000

Netid	State  Recv-Q Send-Q  l-address:Port  Process
tcp	LISTEN	    0	 511          *:9000  users:(("node /home/mz0/",pid=1234,fd=22))


```
Freeze a process list on reboot: `pm2 save`
Status: `pm2 status`
```
┌────┬──────┬──────┬───┬────────┬─────┬────────┐
│ id │ name │ mode │ ↺ │ status │ cpu │ memory │
├────┼──────┼──────┼───┼────────┼─────┼────────┤
│ 0  │ bot  │ fork │ 0 │ online │ 0%  │ 67.9mb │
└────┴──────┴──────┴───┴────────┴─────┴────────┘
```
Logs: `pm2 logs`
Stop: `pm2 stop bot`
Remove init script: `pm2 unstartup systemd`


TODO command like this:
```
curl -X POST \
   -H "Content-Type: application/json" \
   -d '{"update_id": 1234567890,
  "chat": {"id": 434},
  "message_id": 42,
  "date": "2043-06-11T12:00:43Z",
  "text": "test TEXT",
  "caption": "Boo Capt",
  "file_id": null,
  "file_type": null}'  \
   https://wdr.x320.net/historian/bot1
```

Links:
* [PM2 Quick start](https://pm2.keymetrics.io/docs/usage/quick-start/)
* [Run a Daemon](https://pm2.keymetrics.io/docs/usage/startup/)

TODO
* `pm2 reload` - Zero-Downtime Reloads
* `pm2 monit` - real-time, terminal-based monitoring dashboard
* `pm2 deploy` - deployment hooks in ecosystem.config.js ?
* `max_memory_restart` - mitigate memleaks
