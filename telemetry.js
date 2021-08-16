(function () {
    amp.plugin('telemetry', function (options) {
        // checking API
        checkAPI();

        var player = this;
        const sessionId = '_' + Math.random().toString(36).substr(2, 9);

        var init = function () {
            console.log("plugin telemetry initialized with player ", player)
            player.ready(handleReady);
            player.addEventListener(amp.eventName.error, handleError);
        }

        // initialize the plugin
        init();

        function handleReady() {
            player.addEventListener(amp.eventName.loadedmetadata, handleLoadedMetaData);

            var data = {
                ampVersion: player.getAmpVersion(),
                appName: options.appName,
                userAgent: navigator.userAgent,
                options: {
                    autoplay: player.options().autoplay,
                    heuristicProfile: player.options().heuristicProfile,
                    techOrder: JSON.stringify(player.options().techOrder)
                }
            };

            logData("InstanceCreated", 1, data);
        }

        function handleError() {
            var err = player.error();
            var data = {
                currentTime: player.currentTime(),
                code: "0x" + err.code.toString(16),
                message: err.message
            };

            logData("Error", 0, data);
        }

        function handleLoadedMetaData() {
            player.addEventListener(amp.eventName.downloadbitratechanged, handleDownloadBitrateChanged);
            player.addEventListener(amp.eventName.playbackbitratechanged, handlePlaybackBitrateChanged);

            if (player.audioBufferData()) {
                player.audioBufferData().addEventListener(amp.bufferDataEventName.downloadfailed, function () {

                    var data = {
                        currentTime: player.currentTime(),
                        bufferLevel: player.audioBufferData().bufferLevel,
                        url: player.audioBufferData().downloadFailed.mediaDownload.url,
                        code: "0x" + player.audioBufferData().downloadFailed.code.toString(16),
                        message: player.audioBufferData().downloadFailed
                    };

                    logData("DownloadFailed", 0, data);
                });
            }

            if (player.videoBufferData()) {
                player.videoBufferData().addEventListener(amp.bufferDataEventName.downloadfailed, function () {

                    var data = {
                        message: player.videoBufferData().downloadFailed
                    };

                    logData("DownloadFailed", 0, data);
                });
                player.videoBufferData().addEventListener(amp.bufferDataEventName.downloadrequested, function () {
                    var data = {
                        message: {
                            bitrate : player.videoBufferData().downloadRequested.bitrate,
                            mediaTime : player.videoBufferData().downloadRequested.mediaTime,
                            presentationTimeOffsetInSec : player.videoBufferData().downloadRequested.presentationTimeOffsetInSec,
                            durationInSec : player.videoBufferData().downloadRequested.durationInSec,
                        }
                    };
                    logData("DownloadBufferDataRequested", 1, eventData(data));
                });

            }

            const cStream = player.currentVideoStreamList();
            var data = {
                isLive: player.isLive(),
                duration: player.duration(),
                tech: player.currentTechName(),
                videoStreamList: cStream.streams[cStream.selectedIndex].tracks.map(n => ({ selectable: n.selectable, width: n.width, height: n.height, bitrate: n.bitrate })),
            };

            logData("PresentationInfo", 1, data);
        }

        function handlePlaybackBitrateChanged(event) {
            logData("PlaybackBitrateChanged", 1, eventData(event));
        }

        function handleDownloadRequested(event) {
            logData("DownloadBufferDataRequested", 1, eventData(event));
        }

        function handleDownloadBitrateChanged(event) {
            logData("DownloadBitrateChanged", 1, eventData(event));
        }

        function handleStreamSelected(event) {
            logData("StreamSelected", 1, eventData(event));
        }


        function logData(eventId, level, data) {
            var eventLog = {
                sessionId: sessionId,
                currentTime: player.currentTime(),
                eventId: eventId,
                level: level,
                data: data
            };

            callback(eventLog);
        }

        function callback(eventLog) {
            console.log(eventLog);
            $.ajax({
                type: "POST",
                url: "http://localhost:3000/api/telemetry",
                data: JSON.stringify(eventLog),
                contentType: "application/json; charset=utf-8",
                dataType: "json"
              });
            /* var xhr = new XMLHttpRequest();
            xhr.open("POST", "http://localhost:3000/api/telemetry", true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(JSON.stringify(eventLog)); */
        }

        function eventData(event) {
            return {
                isLive: player.isLive(),
                bufferLevel: player.videoBufferData().bufferLevel,
                videoHeight: player.videoHeight(),
                videoWidth: player.videoWidth(),
                currentPlaybackBitrate: player.currentPlaybackBitrate(),
                message: event.message ? event.message : ""
            };
        }
        
        function checkAPI() {
            fetch("http://localhost:3000/check", {
            method: "GET"
            }).then(res => {
            console.log("Request complete! response:", res);
            }).catch(err => {
                alert('Error while checking the API!\nPlease run the JSON-SERVER API')
                console.error(err)
            });
        }
    });
}).call(this);

