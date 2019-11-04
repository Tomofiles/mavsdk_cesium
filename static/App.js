(function () {
    "use strict";

    var now = new Date();

    var bef3Sec = new Date(now.getTime());
    bef3Sec.setSeconds(bef3Sec.getSeconds() - 3);
    var bef3SecStr = formatDate(bef3Sec);
    var nowStr = formatDate(now);
    var aft5hour = new Date(now.getTime());
    aft5hour.setHours(aft5hour.getHours() + 5);
    var aft5hourStr = formatDate(aft5hour);


    var viewer = new Cesium.Viewer('cesiumContainer', {
        scene3DOnly: true,
        selectionIndicator: false,
        baseLayerPicker: false,
        navigationHelpButton: false,
        homeButton: false,
        geocoder: false,
        // animation: false,
        // timeline: false,
        fullscreenButton: false
    });

    viewer.imageryLayers.remove(viewer.imageryLayers.get(0));
    viewer.imageryLayers.addImageryProvider(new Cesium.IonImageryProvider({ assetId: 2 }));

    viewer.terrainProvider = new Cesium.CesiumTerrainProvider({
        url: Cesium.IonResource.fromAssetId(1)
    });

    var czmlStream = new Cesium.CzmlDataSource();
    var telemetryStreamUrl = '/telemetry';

    var telemetryEventSource = new EventSource(telemetryStreamUrl);

    var diffTime = 0;
    telemetryEventSource.onmessage = function(e) {
        diffTime += 1;
        var telemetry = JSON.parse(e.data)
        // 地球固定座標での回転を計算
        var pos = Cesium.Cartesian3.fromDegrees(
            telemetry.position.cartographicDegrees[1],
            telemetry.position.cartographicDegrees[2],
            telemetry.position.cartographicDegrees[3]);
        var mtx4 = Cesium.Transforms.eastNorthUpToFixedFrame(pos);
        var mtx3 = Cesium.Matrix4.getMatrix3(mtx4, new Cesium.Matrix3());
        var base = Cesium.Quaternion.fromRotationMatrix(mtx3);
        // ローカル座標での回転を計算
        // var quatlocal = new Cesium.Quaternion(
        //     telemetry.orientation.unitQuaternion[1],
        //     telemetry.orientation.unitQuaternion[2],
        //     telemetry.orientation.unitQuaternion[3],
        //     telemetry.orientation.unitQuaternion[4]);
        // ローカル座標での回転を計算（NED→ENU）
        var quatlocal = new Cesium.Quaternion(
            telemetry.orientation.unitQuaternion[2],
            telemetry.orientation.unitQuaternion[1],
            -telemetry.orientation.unitQuaternion[3],
            telemetry.orientation.unitQuaternion[4]);
        var quat90 = Cesium.Quaternion.fromAxisAngle(
            new Cesium.Cartesian3(0, 0, 1),
            Cesium.Math.toRadians(90)
        );
        var quatlocal = Cesium.Quaternion.multiply(quatlocal, quat90, new Cesium.Quaternion());
        // 回転を掛け合わせる
        var quat = Cesium.Quaternion.multiply(base, quatlocal, new Cesium.Quaternion());

        var packet = {
            id: "drone",
            position: {
                epoch: nowStr,
                cartographicDegrees: [
                    diffTime,
                    telemetry.position.cartographicDegrees[1],
                    telemetry.position.cartographicDegrees[2],
                    telemetry.position.cartographicDegrees[3]
                ]
            },
            orientation: {
                epoch: nowStr,
                unitQuaternion: [
                    diffTime,
                    quat.x,
                    quat.y,
                    quat.z,
                    quat.w
                ]
            },
            path: {
                show: true,
                width: 1,
                material: {
                    solidColor: {
                        rgba: [
                            0,
                            255,
                            255,
                            255
                        ]
                    }
                }
            }
        };
        czmlStream.process(packet);
    }

    viewer.dataSources.add(czmlStream);

    viewer.clock.shouldAnimate = true;
    var initialPosition = new Cesium.Cartesian3.fromDegrees(-73.985231, 40.730335, 300);
    var homeCameraView = {
        destination : initialPosition,
    };
    viewer.scene.camera.setView(homeCameraView);

    var doc = {
        id: "document",
        version: "1.0",
        clock: {
            interval: bef3SecStr + "/" + aft5hourStr,
            currentTime: bef3SecStr,
            multiplier:1,
            range: "LOOP_STOP",
            step: "SYSTEM_CLOCK_MULTIPLIER"
        }
    };
    czmlStream.process(doc);

    var init = {
        id: "drone",
        name: "Cesium Drone",
        availability: nowStr + "/" + aft5hourStr,
        model: {
            gltf: "CesiumDrone.gltf",
            scale: 0.5,
            minimumPixelSize: 100,
            show: true
        }
    };
    czmlStream.process(init);
}());

function formatDate(date) {

    var format = "YYYY-MM-DDTHH:MI:SSZ";

    format = format.replace(/YYYY/, date.getFullYear());
    format = format.replace(/MM/, ('0' + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/DD/, ('0' + (date.getDate())).slice(-2));
    format = format.replace(/HH/, ('0' + (date.getHours())).slice(-2));
    format = format.replace(/MI/, ('0' + (date.getMinutes())).slice(-2));
    format = format.replace(/SS/, ('0' + (date.getSeconds())).slice(-2));

    return format;
}