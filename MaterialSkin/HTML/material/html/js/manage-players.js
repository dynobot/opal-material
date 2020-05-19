/**
 * LMS-Material
 *
 * Copyright (c) 2018-2020 Craig Drummond <craig.p.drummond@gmail.com>
 * MIT license.
 */
'use strict';

var PMGR_EDIT_GROUP_ACTION       = {cmd:"edit",     icon:"edit"};
var PMGR_DELETE_GROUP_ACTION     = {cmd:"delete",   icon:"delete"};
var PMGR_SYNC_ACTION             = {cmd:"sync",     icon:"link"};
var PMGR_SETTINGS_ACTION         = {cmd:"settings", icon:"speaker"};
var PMGR_POWER_ON_ACTION         = {cmd:"on",       icon:"power_settings_new", dimmed:true};
var PMGR_POWER_OFF_ACTION        = {cmd:"off",      icon:"power_settings_new", active:true};
var PMGR_SLEEP_ACTION            = {cmd:"sleep",    icon:"hotel"};
var PMGR_SET_DEF_PLAYER_ACTION   = {cmd:"sdp",      icon:"check_box_outline_blank"};
var PMGR_UNSET_DEF_PLAYER_ACTION = {cmd:"usdp",     icon:"check_box", active:true};

var nameMap = {};

function getSyncMasterName(player) {
    if (undefined==player.syncmaster || player.syncmaster.length<1) {
        return player.name;
    }
    let name = nameMap[player.syncmaster];
    return undefined==name ? "" : name;
}

function playerSyncSort(a, b) {
    if (a.isgroup!=b.isgroup) {
        return a.isgroup ? 1 : -1;
    }

    var masterA = getSyncMasterName(a).toLowerCase();
    var masterB = getSyncMasterName(b).toLowerCase();
    if (masterA < masterB) {
        return -1;
    }
    if (masterA > masterB) {
        return 1;
    }
    if (masterA.length>0) {
        if (a.issyncmaster && !b.issyncmaster) {
            return -1;
        }
        if (!a.issyncmaster && b.issyncmaster) {
            return 1;
        }
    }
    var nameA = a.name.toLowerCase();
    var nameB = b.name.toLowerCase();
    if (nameA < nameB) {
        return -1;
    }
    if (nameA > nameB) {
        return 1;
    }
    return 0;
}

Vue.component('lms-manage-players', {
    template: `
<v-dialog v-model="show" v-if="show" scrollable fullscreen>
 <v-card>
  <v-card-title class="settings-title">
   <v-toolbar app-data class="dialog-toolbar">
    <v-btn flat icon @click.native="close" :title="i18n('Close')"><v-icon>arrow_back</v-icon></v-btn>
    <v-toolbar-title>{{TB_MANAGE_PLAYERS.title}}</v-toolbar-title>
    <v-spacer></v-spacer>
    <v-menu bottom left v-model="showMenu">
     <v-btn icon slot="activator"><v-icon>more_vert</v-icon></v-btn>
     <v-list>
      <v-list-tile @click="sleepAll">
       <v-list-tile-avatar v-if="menuIcons"><v-icon>hotel</v-icon></v-list-tile-avatar>
       <v-list-tile-content><v-list-tile-title>{{i18n('Set sleep time for all players')}}</v-list-tile-title></v-list-tile-content>
      </v-list-tile>
      <v-list-tile @click="createGroup" v-if="manageGroups">
       <v-list-tile-avatar v-if="menuIcons"><v-icon>add_circle_outline</v-icon></v-list-tile-avatar>
       <v-list-tile-content><v-list-tile-title>{{i18n("Create group player")}}</v-list-tile-title></v-list-tile-content>
      </v-list-tile>
     </v-list>
    </v-menu>
   </v-toolbar>
  </v-card-title>

  <div class="ios-vcard-text-workaround">
   <v-container grid-list-md class="pmgr-container">
    <v-layout row wrap>
     <div v-for="(player, index) in players" :key="player.id" style="width:100%" v-bind:class="{'pmgr-sync':!isMainPlayer(player)}">
      <v-flex xs12 v-if="0==index && !player.isgroup && manageGroups && players[players.length-1].isgroup" class="pmgr-title ellipsis">{{i18n('Standard Players')}}</v-flex>
      <v-flex xs12 v-if="player.isgroup && (0==index || !players[index-1].isgroup)" class="pmgr-title pmgr-grp-title ellipsis">{{i18n('Group Players')}}</v-flex>
      <v-flex xs12>
       <v-list class="pmgr-playerlist">
        <v-list-tile>
         <v-list-tile-avatar v-if="player.image && isMainPlayer(player)" :tile="true" v-bind:class="{'dimmed': !player.ison}">
          <img :key="player.image" v-lazy="player.image"></img>
         </v-list-tile-avatar>
         <v-list-tile-content>
          <v-list-tile-title style="cursor:pointer" @click="setActive(player.id)"><v-icon small class="pmgr-radio">{{currentPlayer && currentPlayer.id==player.id ? 'radio_button_checked' : 'radio_button_unchecked'}}</v-icon>{{player.name}}<v-icon v-if="player.id==defaultPlayer" class="player-status-icon">check</v-icon><v-icon v-if="player.will_sleep_in" class="player-status-icon">hotel</v-icon></v-list-tile-title>
          <v-list-tile-sub-title v-if="isMainPlayer(player)" v-bind:class="{'dimmed': !player.ison}">{{player.track}}</v-list-tile-sub-title>
         </v-list-tile-content>
         <v-list-tile-action v-if="player.playIcon && showAllButtons && isMainPlayer(player)" class="pmgr-btn pmgr-btn-control" v-bind:class="{'disabled':!player.hasTrack}" @click="prevTrack(player)" :title="player.name + ' - ' + trans.prev">
          <v-btn icon><v-icon>skip_previous</v-icon></v-btn>
         </v-list-tile-action>
         <v-list-tile-action v-if="player.playIcon && isMainPlayer(player)" class="pmgr-btn pmgr-btn-control" v-bind:class="{'disabled':!player.hasTrack}" @click="playPause(player)" :title="player.name + ' - ' + (player.isplaying ? trans.pause : trans.play)">
           <v-btn icon><v-icon>{{player.playIcon}}</v-icon></v-btn>
         </v-list-tile-action>
         <v-list-tile-action v-if="player.playIcon && showAllButtons && stopButton && isMainPlayer(player)" class="pmgr-btn pmgr-btn-control" @click="stop(player)" v-bind:class="{'disabled':!player.hasTrack}" :title="player.name + ' - ' + trans.stop">
           <v-btn icon><v-icon>stop</v-icon></v-btn>
         </v-list-tile-action>
         <v-list-tile-action v-if="player.playIcon && showAllButtons && isMainPlayer(player)" class="pmgr-btn pmgr-btn-control" @click="nextTrack(player)" v-bind:class="{'disabled':!player.hasTrack}" :title="player.name + ' - ' + trans.next">
          <v-btn icon><v-icon>skip_next</v-icon></v-btn>
         </v-list-tile-action>
        </v-list-tile>
       </v-list>
      </v-flex xs12>
      <v-flex xs12>
       <v-layout>
        <v-btn flat icon @click="volumeDown(player)" class="pmgr-btn pmgr-vol-dec-btn" :title="player.name + ' - ' + trans.decVol" v-bind:class="{'dimmed': !player.ison}"><v-icon>{{player.muted ? 'volume_off' : 'volume_down'}}</v-icon></v-btn>
        <v-slider @change="volumeChanged(player)" step="1" v-model="player.volume" class="pmgr-vol-slider" v-bind:class="{'dimmed': !player.ison}"></v-slider>
        <v-btn flat icon @click="volumeUp(player)" class="pmgr-btn" :title="player.name + ' - ' + trans.incVol" v-bind:class="{'dimmed': !player.ison}"><v-icon>{{player.muted ? 'volume_off' : 'volume_up'}}</v-icon></v-btn>
        <p class="pmgr-vol" v-bind:class="{'pmgr-vol-small':!showAllButtons,  'dimmed': !player.ison}">{{player.volume}}%</p>
        <v-btn icon @click.stop="playerMenu(player, $event)" class="pmgr-btn" :title="player.name + ' - ' + trans.menu"><v-icon>more_vert</v-icon></v-btn>
       </v-layout>
      </v-flex>
     </div>
    </v-layout>
   </v-container>
  </div>
  <div class="dialog-padding"></div>
 </v-card>

 <v-menu offset-y v-model="menu.show" :position-x="menu.x" :position-y="menu.y">
  <v-list>
   <template v-for="(action, index) in menu.actions">
    <v-divider v-if="DIVIDER===action"></v-divider>
    <v-list-tile v-else-if="PMGR_SYNC_ACTION!=action || multipleStandardPlayers" @click="playerAction(menu.player, action.cmd)">
     <v-list-tile-avatar v-if="menuIcons"><v-icon v-bind:class="{'dimmed': action.dimmed, 'active-btn': action.active}">{{action.icon}}</v-icon></v-list-tile-avatar>
     <v-list-tile-title>{{action.title}}</v-list-tile-title>
    </v-list-tile>
   </template>
   <v-divider v-if="menu.customActions && menu.customActions.length>0"></v-divider>
   <template v-if="menu.customActions && menu.customActions.length>0" v-for="(action, index) in menu.customActions">
    <v-list-tile @click="performCustomAction(action, menu.player)">
     <v-list-tile-avatar v-if="menuIcons"><v-icon v-if="action.icon">{{action.icon}}</v-icon><img v-else-if="action.svg" class="svg-img" :src="action.svg | svgIcon(darkUi)"></img></v-list-tile-avatar>
     <v-list-tile-content><v-list-tile-title>{{action.title}}</v-list-tile-title></v-list-tile-content>
    </v-list-tile>
   </template>
  </v-list>
 </v-menu>
</v-dialog>
`,
    props: [],
    data() {
        return {
            show: false,
            showMenu: false,
            showAllButtons: true,
            players: [],
            manageGroups: false,
            menu: { show:false, player:undefined, actions:[], x:0, y:0, customActions:undefined },
            trans: { play:undefined, pause:undefined, stop:undefined, prev:undefined, next:undefined, decVol:undefined, incVol:undefined, menu:undefined }
        }
    },
    mounted() {
        this.noImage = resolveImageUrl(LMS_BLANK_COVER);
        bus.$on('manage.open', function(act) {
            this.players = [];
            this.show = true;
            this.openDialogs = 0;

            // Check to see if we can manage groups...
            this.manageGroups = getLocalStorageBool('manageGroups', false);
            lmsCommand("", ["can", "playergroups", "items", "?"]).then(({data}) => {
                if (data && data.result && undefined!=data.result._can && 1==data.result._can) {
                    lmsCommand("", ["playergroups", "can-manage"]).then(({data}) => {
                        this.manageGroups = undefined!=data.result && 1==data.result['can-manage'];
                        setLocalStorageVal('manageGroups', this.manageGroups);
                    }).catch(err => {
                        this.manageGroups = false;
                        setLocalStorageVal('manageGroups', this.manageGroups);
                    });
                } else {
                    this.manageGroups = false;
                    setLocalStorageVal('manageGroups', this.manageGroups);
                }
            });
        }.bind(this));

        bus.$on('syncChanged', function() {
            this.updateAll();
        }.bind(this));

        this.showAllButtons = window.innerWidth>=400;
        this.$nextTick(() => {
            window.addEventListener('resize', () => {
                this.showAllButtons = window.innerWidth>=400;
            });
        });

        bus.$on('langChanged', function() {
            this.initItems();
        }.bind(this));
        this.initItems();

        bus.$on('esc', function() {
            if (this.showMenu) {
                this.showMenu = false;
            } else if (this.menu.show) {
                this.menu.show = false;
            } else if (this.$store.state.activeDialog == 'manage') {
                this.close();
            }
        }.bind(this));
        bus.$on('hideMenu', function(name) {
            if (name=='manage-menu') {
                this.showMenu= false;
            }
        }.bind(this));

        bus.$on('playerStatus', function(player) {
            this.updatePlayer(player);
        }.bind(this));

        bus.$on('otherPlayerStatus', function(player) {
            this.updatePlayer(player);
        }.bind(this));

        bus.$on('noPlayers', function() {
            this.show=false;
            this.showMenu = false;
        }.bind(this));

        bus.$on('playersRemoved', function(players) {
            if (this.show) {
                for (var i=0, len=players.length; i<len; ++i) {
                    for (var j=0, jlen=this.players.length; j<jlen; ++j) {
                        if (this.players[j].id==players[i]) {
                            this.players.splice(j, 1);
                            break;
                        }
                    }
                }

                if (this.players.length<1) {
                    this.show = false;
                }
            }
        }.bind(this));
    },
    methods: {
        initItems() {
            PMGR_EDIT_GROUP_ACTION.title=i18n("Edit");
            PMGR_DELETE_GROUP_ACTION.title=i18n("Delete");
            PMGR_SYNC_ACTION.title=i18n("Synchronise");
            PMGR_SETTINGS_ACTION.title=i18n("Player settings");
            PMGR_POWER_ON_ACTION.title=i18n("Switch on");
            PMGR_POWER_OFF_ACTION.title=i18n("Switch off");
            PMGR_SLEEP_ACTION.title=i18n("Sleep");
            PMGR_SET_DEF_PLAYER_ACTION.title=PMGR_UNSET_DEF_PLAYER_ACTION.title=i18n("Default player");
            this.trans = { play:i18n("Play"), pause:i18n("Pause"), stop:i18n("Stop"), prev:i18n("Previous track"), next:i18n("Next track"),
                           decVol:i18n("Decrease volume"), incVol:i18n("Increase volume"), menu:i18n("Menu") };
        },
        playerMenu(player, event) {
            this.menu.actions=[PMGR_SYNC_ACTION, PMGR_SETTINGS_ACTION, player.ison ? PMGR_POWER_OFF_ACTION : PMGR_POWER_ON_ACTION, PMGR_SLEEP_ACTION];
            this.menu.x=event.clientX;
            this.menu.y=event.clientY;
            this.menu.player=player;

            if (player.isgroup) {
                this.menu.actions.push(DIVIDER);
                this.menu.actions.push(PMGR_EDIT_GROUP_ACTION);
                this.menu.actions.push(PMGR_DELETE_GROUP_ACTION);
            }
            this.menu.actions.push(DIVIDER);
            this.menu.actions.push(player.id == this.$store.state.defaultPlayer ? PMGR_UNSET_DEF_PLAYER_ACTION : PMGR_SET_DEF_PLAYER_ACTION);
            this.menu.customActions = getCustomActions(player.id, this.$store.state.unlockAll);
            this.menu.show = true;
        },
        createGroup() {
            bus.$emit('dlg.open', 'group', 'create');
        },
        sleepAll() {
            bus.$emit('dlg.open', 'sleep');
        },
        playerAction(player, cmd) {
            if (PMGR_EDIT_GROUP_ACTION.cmd==cmd) {
                bus.$emit('dlg.open', 'group', 'edit', player);
            } else if (PMGR_DELETE_GROUP_ACTION.cmd==cmd) {
                this.deleteGroup(player);
            } else if (PMGR_SYNC_ACTION.cmd==cmd) {
                bus.$emit('dlg.open', 'sync', player);
            } else if (PMGR_SETTINGS_ACTION.cmd==cmd) {
                bus.$emit('dlg.open', 'playersettings', player);
            } else if (PMGR_POWER_ON_ACTION.cmd==cmd || PMGR_POWER_OFF_ACTION.cmd==cmd) {
                this.togglePower(player);
            } else if (PMGR_SLEEP_ACTION.cmd==cmd) {
                bus.$emit('dlg.open', 'sleep', player);
            } else if (PMGR_SET_DEF_PLAYER_ACTION.cmd==cmd) {
                this.$store.commit('setDefaultPlayer', player.id);
            } else if (PMGR_UNSET_DEF_PLAYER_ACTION.cmd==cmd) {
                this.$store.commit('setDefaultPlayer', undefined);
            }
        },
        close() {
            this.menu.show=false;
            this.show=false;
            this.showMenu = false;
        },
        i18n(str) {
            if (this.show) {
                return i18n(str);
            } else {
                return str;
            }
        },
        volumeDown(player/*, toggleMute*/) {
            if (!this.show || this.$store.state.visibleMenus.size>0) {
                return;
            }
            //if (toggleMute) {
            //    this.toggleMute(player);
            //} else {
                this.setVolume(player, adjustVolume(player.volume, false));
            //}
        },
        volumeUp(player/*, toggleMute*/) {
            if (!this.show || this.$store.state.visibleMenus.size>0) {
                return;
            }
            //if (toggleMute) {
            //    this.toggleMute(player);
            //} else {
                this.setVolume(player, adjustVolume(player.volume, true));
            //}
        },
        setVolume(player, vol) {
            if (!this.show) {
                return;
            }
            lmsCommand(player.id, ["mixer", "volume", vol]).then(({data}) => {
                player.volume = vol;
            });
        },
        /*toggleMute(player) {
            lmsCommand(player.id, ['mixer', 'muting', 'toggle']).then(({data}) => {
                lmsCommand(player.id, ["mixer", "volume", "?"]).then(({data}) => {
                    if (data && data.result && undefined!=data.result._volume) {
                        var vol = parseInt(data.result._volume);
                        player.volume = vol<0 ? vol*-1 : vol;
                        player.muted = vol<0;
                    }
                });
            });
        },*/
        volumeChanged(player) {
            this.setVolume(player, player.volume);
        },
        togglePower(player) {
            if (!this.show) {
                return;
            }
            lmsCommand(player.id, ["power", player.ison ? "0" : "1"]).then(({data}) => {
                bus.$emit('refreshStatus', player.id);
            });
        },
        playPause(player) {
            if (!this.show || this.$store.state.visibleMenus.size>0 || !player.hasTrack) {
                return;
            }
            lmsCommand(player.id, player.isplaying ? ['pause', '1'] : ['play']).then(({data}) => {
                bus.$emit('refreshStatus', player.id);
            });
        },
        stop(player) {
            if (!this.show || this.$store.state.visibleMenus.size>0 || !player.hasTrack) {
                return;
            }
            lmsCommand(player.id, ['stop']).then(({data}) => {
                bus.$emit('refreshStatus', player.id);
            });
        },
        prevTrack(player) {
            if (!this.show || this.$store.state.visibleMenus.size>0 || !player.hasTrack) {
                return;
            }
            lmsCommand(player.id, ['button', 'jump_rew']).then(({data}) => {
                bus.$emit('refreshStatus', player.id);
            });
        },
        nextTrack(player) {
            if (!this.show || this.$store.state.visibleMenus.size>0 || !player.hasTrack) {
                return;
            }
            lmsCommand(player.id, ['playlist', 'index', '+1']).then(({data}) => {
                bus.$emit('refreshStatus', player.id);
            });
        },
        setActive(id) {
            if (id != this.$store.state.player.id && this.$store.state.visibleMenus.size<=0) {
                this.$store.commit('setPlayer', id);
            }
        },
        deleteGroup(player) {
            this.$confirm(i18n("Delete '%1'?", player.name), {buttonTrueText: i18n('Delete'), buttonFalseText: i18n('Cancel')}).then(res => {
                if (res) {
                    lmsCommand("", ['playergroups', 'delete', 'id:'+player.id]).then(({data}) => {
                        // If server status is refreshed straight away, group player comes back (in listing). Delaying for 1/4 seems to
                        // work-around this. Perhaps deletion is slow?
                        setTimeout(function () {
                            bus.$emit('refreshServerStatus');
                            // Just in case the 1/4 second was not enough, refresh agian in 100ms
                            setTimeout(function () {
                                bus.$emit('refreshServerStatus');
                            }.bind(this), 100);
                        }.bind(this), 250);
                    });
                }
            });
        },
        updateAll() {
            if (!this.show) {
                return;
            }
            for (let i=0, len=this.players.length; i<len; ++i) {
                bus.$emit('refreshStatus', this.players[i].id);
            }
        },
        updatePlayer(player) {
            if (!this.show) {
                return;
            }
            nameMap[player.id]=player.name;

            player.image = undefined;
            if (player.current) {
                if (player.current.artwork_url) {
                    player.image=resolveImageUrl(player.current.artwork_url);
                }
                if (undefined==player.image && player.current.coverid) {
                    player.image=resolveImageUrl("/music/"+player.current.coverid+"/cover.jpg");
                }
                if (undefined==player.image) {
                    player.image=resolveImageUrl("/music/current/cover.jpg?player=" + player.id);
                }
            }
            if (undefined==player.image) {
                player.image = this.noImage;
            }

            player.playIcon = player.isplaying ? (this.$store.state.stopButton ? "pause" : "pause_circle_outline") :
                                                 (this.$store.state.stopButton ? "play_arrow" : "play_circle_outline");
            player.hasTrack = true;
            if (player.current.title) {
                if (player.current.artist) {
                    player.track=player.current.title+SEPARATOR+player.current.artist;
                } else {
                    player.track=player.current.title;
                }
            } else if (player.current.artist) {
                player.track=player.current.artist;
            } else {
                player.track="...";
                player.hasTrack = false;
            }
            
            var found = false;
            for (var i=0, len=this.players.length; i<len; ++i) {
                if (this.players[i].id==player.id) {
                    found=true;
                    this.$set(this.players, i, player);
                    break;
                }
            }
            if (!found) {
                this.players.push(player);
            }
            this.players.sort(playerSyncSort);
        },
        isMainPlayer(player) {
            return player.isgroup || player.issyncmaster || !player.syncslaves || player.syncslaves<1;
        }
    },
    computed: {
        currentPlayer() {
            return this.$store.state.player
        },
        defaultPlayer() {
            return this.$store.state.defaultPlayer
        },
        stopButton() {
            return this.$store.state.stopButton
        },
        multipleStandardPlayers () {
            if (this.$store.state.players) {
                var len = this.$store.state.players.length;
                return len>1 && !this.$store.state.players[0].isgroup && !this.$store.state.players[1].isgroup;
            }
            return false;
        },
        menuIcons() {
            return this.$store.state.menuIcons
        },
        darkUi () {
            return this.$store.state.darkUi
        },
    },
    filters: {
        svgIcon: function (name, dark) {
            return "/material/svg/"+name+"?c="+(dark ? LMS_DARK_SVG : LMS_LIGHT_SVG)+"&r="+LMS_MATERIAL_REVISION;
        }
    },
    watch: {
        'show': function(val) {
            this.$store.commit('dialogOpen', {name:'manage', shown:val});
            bus.$emit('subscribeAll', val);
        },
        'menu.show': function(val) {
            this.$store.commit('menuVisible', {name:'manage', shown:val});
        },
        'showMenu': function(val) {
            this.$store.commit('menuVisible', {name:'manage-menu', shown:val});
        }
    }
})

