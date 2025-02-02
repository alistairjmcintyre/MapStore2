/**
 * Copyright 2015, GeoSolutions Sas.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import expect from 'expect';
import { isNearlyEqual } from '../MapUtils';

import {
    reproject,
    getProjectedBBox,
    reprojectBbox,
    getAvailableCRS,
    calculateAzimuth,
    normalizeSRS,
    getCompatibleSRS,
    reprojectGeoJson,
    getGeoJSONExtent,
    coordsOLtoLeaflet,
    getViewportGeometry,
    parseString,
    getWMSBoundingBox,
    fetchProjRemotely,
    determineCrs,
    calculateDistance,
    FORMULAS,
    transformLineToArcs,
    transformArcsToLine,
    getNormalizedLatLon,
    isInsideVisibleArea,
    centerToVisibleArea,
    roundCoord,
    makeBboxFromOWS,
    extractCrsFromURN,
    makeNumericEPSG,
    getPolygonFromCircle,
    getProjections,
    getExtentForProjection,
    checkIfLayerFitsExtentForProjection,
    normalizeGeometry,
    getLonLatFromPoint, convertRadianToDegrees, convertDegreesToRadian
} from '../CoordinatesUtils';
import { setConfigProp, removeConfigProp } from '../ConfigUtils';
import Proj4js from 'proj4';

describe('CoordinatesUtils', () => {
    afterEach((done) => {
        document.body.innerHTML = '';

        setTimeout(done);
    });
    const valueIsApproximatelyEqual = (value, comparisonValue, epsilon = 0.1) => {
        return (Math.abs(value - comparisonValue) < epsilon);
    };
    it('convert lat lon to mercator without specifying source and dest', () => {
        const point = [45, 13];
        const transformed = reproject(point, "", "");
        expect(transformed).toNotExist();
        expect(transformed).toEqual(null);
        const transformed2 = reproject(point, null, null);
        expect(transformed2).toNotExist();
        expect(transformed2).toEqual(null);
        const transformed3 = reproject(point, undefined, undefined);
        expect(transformed3).toNotExist();
        expect(transformed3).toEqual(null);
    });
    it('convert lat lon to mercator', () => {
        var point = [45, 13];

        var transformed = reproject(point, 'EPSG:4326', 'EPSG:900913');

        expect(transformed).toExist();
        expect(transformed.x).toExist();
        expect(transformed.y).toExist();
        expect(transformed.srs).toExist();

        expect(transformed.x).toNotBe(45);
        expect(transformed.y).toNotBe(13);
        expect(transformed.srs).toBe('EPSG:900913');
    });
    it('it should tests the creation of a bbox given the center, resolution and size', () => {
        let center = {x: 0, y: 0};
        let resolution = 1;
        let rotation = 0;
        let size = [10, 10];
        let bbox = getProjectedBBox(center, resolution, rotation, size);
        expect(bbox).toExist();
        expect(bbox.maxx).toBeGreaterThan(bbox.minx);
        expect(bbox.maxy).toBeGreaterThan(bbox.miny);
    });

    it('convert lat lon bbox to marcator bbox', () => {
        var bbox = [44, 12, 45, 13];
        var projbbox = reprojectBbox(bbox, 'EPSG:4326', 'EPSG:900913');

        expect(projbbox).toExist();
        expect(projbbox.length).toBe(4);
        for (let i = 0; i < 4; i++) {
            expect(projbbox[i]).toNotBe(bbox[i]);
        }
    });
    it('test getAvailableCRS', () => {
        const defs = Object.keys(Proj4js.defs);
        const toCheck = Object.keys(getAvailableCRS());

        toCheck.forEach(item => {
            expect(defs.indexOf(item) !== -1);
        });
    });
    it('test calculateAzimuth', () => {
        var point1 = [0, 0];
        var point2 = [1, 1];
        var proj = 'EPSG:900913';
        var azimuth = calculateAzimuth(point1, point2, proj);

        expect(azimuth.toFixed(2)).toBe('45.00');
    });
    it('test normalizeSRS', () => {
        expect(normalizeSRS('EPSG:900913')).toBe('EPSG:3857');
    });

    it('test normalizeSRS with allowedSRS', () => {
        expect(normalizeSRS('EPSG:900913', {'EPSG:900913': true})).toBe('EPSG:900913');
    });

    it('test getCompatibleSRS', () => {
        expect(getCompatibleSRS('EPSG:900913', {'EPSG:900913': true})).toBe('EPSG:900913');
        expect(getCompatibleSRS('EPSG:900913', {'EPSG:900913': true, 'EPSG:3857': true})).toBe('EPSG:900913');
        expect(getCompatibleSRS('EPSG:900913', {'EPSG:3857': true})).toBe('EPSG:3857');

        expect(getCompatibleSRS('EPSG:3857', {'EPSG:900913': true})).toBe('EPSG:900913');
        expect(getCompatibleSRS('EPSG:3857', {'EPSG:900913': true, 'EPSG:3857': true})).toBe('EPSG:3857');
        expect(getCompatibleSRS('EPSG:3857', {'EPSG:3857': true})).toBe('EPSG:3857');
    });
    it('test reprojectGeoJson', () => {
        const testPoint = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [
                            -112.50042920000001,
                            42.22829164089942
                        ]
                    },
                    properties: {
                        "serial_num": "12C324776"
                    },
                    id: 0
                }
            ]
        };
        const reprojectedTestPoint = reprojectGeoJson(testPoint, "EPSG:4326", "EPSG:900913");
        expect(reprojectedTestPoint).toExist();
        expect(reprojectedTestPoint.features).toExist();
        expect(reprojectedTestPoint.features[0]).toExist();
        expect(reprojectedTestPoint.features[0].type).toBe("Feature");
        expect(reprojectedTestPoint.features[0].geometry.type).toBe("Point");
        // approximate values should be the same
        expect(reprojectedTestPoint.features[0].geometry.coordinates[0].toFixed(4)).toBe((-12523490.492568726).toFixed(4));
        expect(reprojectedTestPoint.features[0].geometry.coordinates[1].toFixed(4)).toBe((5195238.005360028).toFixed(4));
    });
    it('test geojson extent', () => {
        let geojsonPoint = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [125.6, 10.1]
            },
            "properties": {
                "name": "Dinagat Islands"
            }
        };
        expect(getGeoJSONExtent(geojsonPoint)[0] <= 125.6).toBe(true);
        expect(getGeoJSONExtent(geojsonPoint)[1] <= 10.1).toBe(true);
        expect(getGeoJSONExtent(geojsonPoint)[2] >= 125.6).toBe(true);
        expect(getGeoJSONExtent(geojsonPoint)[3] >= 10.1).toBe(true);
        let featureCollection = { "type": "FeatureCollection",
            "features": [
                { "type": "Feature",
                    "geometry": {"type": "Point", "coordinates": [102.0, 0.5]},
                    "properties": {"prop0": "value0"}
                },
                { "type": "Feature",
                    "geometry": {
                        "type": "GeometryCollection",
                        "geometries": [{"type": "Point", "coordinates": [102.0, 0.5]}]
                    },
                    "properties": {"prop0": "value0"}
                },
                { "type": "Feature",
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [
                            [102.0, 0.0], [103.0, 1.0], [104.0, 0.0], [105.0, 1.0]
                        ]
                    },
                    "properties": {
                        "prop0": "value0",
                        "prop1": 0.0
                    }
                },
                { "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
                                [100.0, 1.0], [100.0, 0.0] ]
                        ]
                    },
                    "properties": {
                        "prop0": "value0",
                        "prop1": {"this": "that"}
                    }
                }
            ]
        };
        expect(getGeoJSONExtent(featureCollection)[0]).toBe(100.0);
        expect(getGeoJSONExtent(featureCollection)[1]).toBe(0.0);
        expect(getGeoJSONExtent(featureCollection)[2]).toBe(105.0);
        expect(getGeoJSONExtent(featureCollection)[3]).toBe(1.0);
        expect(getGeoJSONExtent({ "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [ [100.0, 0.0], [101.0, 0.0], [101.0, 1.0],
                        [100.0, 1.0], [100.0, 0.0] ]
                ]
            },
            "properties": {
                "prop0": "value0",
                "prop1": {"this": "that"}
            }
        })).toEqual([ 100, 0, 101, 1 ]);
    });
    it('test coordsOLtoLeaflet on point', () => {
        let geojsonPoint = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [125.6, 10.1]
            }
        };
        expect(coordsOLtoLeaflet(geojsonPoint.geometry)).toBe(geojsonPoint.geometry.coordinates.reverse());
    });
    it('test coordsOLtoLeaflet on LineString', () => {
        let geojsonPoint = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": [[1, 2], [3, 4]]
            }
        };
        const reversedPoint = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": geojsonPoint.geometry.coordinates.map(point => point.reverse())
            }
        };

        expect(coordsOLtoLeaflet(geojsonPoint.geometry)[0]).toBe(reversedPoint.geometry.coordinates[0]);
        expect(coordsOLtoLeaflet(geojsonPoint.geometry)[1]).toBe(reversedPoint.geometry.coordinates[1]);
    });
    it('test coordsOLtoLeaflet on Polygon', () => {
        let geojsonPoint = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": [[[1, 2], [3, 4], [5, 6], [1, 2]]]
            }
        };
        const reversedPoint = {
            "type": "Feature",
            "geometry": {
                "type": "Polygon",
                "coordinates": geojsonPoint.geometry.coordinates[0].map(point => point.reverse())
            }
        };

        expect(coordsOLtoLeaflet(geojsonPoint.geometry)[0][0]).toBe(reversedPoint.geometry.coordinates[0]);
        expect(coordsOLtoLeaflet(geojsonPoint.geometry)[0][1]).toBe(reversedPoint.geometry.coordinates[1]);
        expect(coordsOLtoLeaflet(geojsonPoint.geometry)[0][2]).toBe(reversedPoint.geometry.coordinates[2]);
        expect(coordsOLtoLeaflet(geojsonPoint.geometry)[0][3]).toBe(reversedPoint.geometry.coordinates[3]);
    });

    it('test getViewportGeometry not listed projection', () => {
        expect(getViewportGeometry({
            minx: -160,
            miny: -50,
            maxx: 130,
            maxy: 60
        }, 'EPSG:UNKOWN')).toEqual({
            type: 'Polygon',
            radius: 0,
            projection: 'EPSG:UNKOWN',
            coordinates: [ [ [ -160, -50 ], [ -160, 60 ], [ 130, 60 ], [ 130, -50 ], [ -160, -50 ] ] ],
            extent: [-160, -50, 130, 60],
            center: [-15, 5]
        });
    });

    it('test getViewportGeometry projection EPSG:4326', () => {
        expect(getViewportGeometry({
            minx: -160,
            miny: -50,
            maxx: 130,
            maxy: 60
        }, 'EPSG:4326')).toEqual({
            type: 'Polygon',
            radius: 0,
            projection: 'EPSG:4326',
            coordinates: [ [ [ -160, -50 ], [ -160, 60 ], [ 130, 60 ], [ 130, -50 ], [ -160, -50 ] ] ],
            extent: [-160, -50, 130, 60],
            center: [-15, 5]
        });
    });

    it('test getViewportGeometry projection EPSG:4326 world view', () => {
        expect(getViewportGeometry({
            minx: -190,
            miny: -50,
            maxx: 230,
            maxy: 60
        }, 'EPSG:4326')).toEqual({
            type: 'Polygon',
            radius: 0,
            projection: 'EPSG:4326',
            coordinates: [ [ [ -180, -50 ], [ -180, 60 ], [ 180, 60 ], [ 180, -50 ], [ -180, -50 ] ] ],
            extent: [-180, -50, 180, 60],
            center: [0, 5]
        });
    });

    it('test getViewportGeometry projection EPSG:4326 on IDL center position > -180', () => {
        expect(getViewportGeometry({
            minx: -190,
            miny: -50,
            maxx: -160,
            maxy: 60
        }, 'EPSG:4326')).toEqual({
            type: 'MultiPolygon',
            radius: 0,
            projection: 'EPSG:4326',
            coordinates: [
                [[[ -180, -50 ], [ -180, 60 ], [ -160, 60 ], [ -160, -50 ], [ -180, -50 ]]],
                [[[ 170, -50 ], [ 170, 60 ], [ 180, 60 ], [ 180, -50 ], [ 170, -50 ]]]
            ],
            extent: [
                [-180, -50, -160, 60],
                [170, -50, 180, 60]
            ],

            center: [ -175, 5]
        });
    });


    it('test getViewportGeometry projection EPSG:4326 on IDL center position < 180', () => {
        expect(getViewportGeometry({
            minx: -230,
            miny: -50,
            maxx: -160,
            maxy: 60
        }, 'EPSG:4326')).toEqual({
            type: 'MultiPolygon',
            radius: 0,
            projection: 'EPSG:4326',
            coordinates: [
                [[[ -180, -50 ], [ -180, 60 ], [ -160, 60 ], [ -160, -50 ], [ -180, -50 ]]],
                [[[ 130, -50 ], [ 130, 60 ], [ 180, 60 ], [ 180, -50 ], [ 130, -50 ]]]
            ],
            extent: [
                [-180, -50, -160, 60],
                [130, -50, 180, 60]
            ],
            center: [ 165, 5]
        });

    });

    it('test getViewportGeometry projection EPSG:4326 on IDL center x values < -180', () => {
        expect(getViewportGeometry({
            minx: -1640,
            miny: -50,
            maxx: -1950,
            maxy: 60
        }, 'EPSG:4326')).toEqual({
            type: 'MultiPolygon',
            radius: 0,
            projection: 'EPSG:4326',
            coordinates: [
                [[[ -180, -50 ], [ -180, 60 ], [ -150, 60 ], [ -150, -50 ], [ -180, -50 ]]],
                [[[ 160, -50 ], [ 160, 60 ], [ 180, 60 ], [ 180, -50 ], [ 160, -50 ]]]
            ],
            extent: [
                [-180, -50, -150, 60],
                [160, -50, 180, 60]
            ],
            center: [ -175, 5]
        });

    });

    it('test getViewportGeometry projection EPSG:4326 on IDL x values > 180', () => {
        expect(getViewportGeometry({
            minx: 880,
            miny: -50,
            maxx: 930,
            maxy: 60
        }, 'EPSG:4326')).toEqual({
            type: 'MultiPolygon',
            radius: 0,
            projection: 'EPSG:4326',
            coordinates: [
                [[[ -180, -50 ], [ -180, 60 ], [ -150, 60 ], [ -150, -50 ], [ -180, -50 ]]],
                [[[ 160, -50 ], [ 160, 60 ], [ 180, 60 ], [ 180, -50 ], [ 160, -50 ]]]
            ],
            extent: [
                [-180, -50, -150, 60],
                [160, -50, 180, 60]
            ],
            center: [ -175, 5]
        });
    });

    it('test getViewportGeometry projection EPSG:900913', () => {

        expect(getViewportGeometry({
            minx: -8932736.873518841,
            miny: 1995923.6825825204,
            maxx: -2162250.6561310687,
            maxy: 6584591.364598222
        }, 'EPSG:900913')).toEqual({
            type: 'Polygon',
            radius: 0,
            projection: 'EPSG:900913',
            coordinates: [ [ [ -8932736.873518841, 1995923.68258252 ], [ -8932736.873518841, 6584591.364598221 ], [ -2162250.656131069, 6584591.364598221 ], [ -2162250.656131069, 1995923.68258252 ], [ -8932736.873518841, 1995923.68258252 ] ] ],
            extent: [-8932736.873518841, 1995923.68258252, -2162250.656131069, 6584591.364598221],
            center: [-5547493.764824955, 4290257.523590371]
        });
    });

    it('test getViewportGeometry projection EPSG:900913 world view', () => {

        // EPSG:900913 -20037508.342789244 - 20037508.342789244 | EPSG:4326 -180 | 180
        expect(getViewportGeometry({
            minx: -77527937.55286229,
            miny: -32150025.592971414,
            maxx: 30799841.925342064,
            maxy: 41268657.319279805
        }, 'EPSG:900913')).toEqual({
            type: 'Polygon',
            radius: 0,
            projection: 'EPSG:900913',
            coordinates: [ [ [ -20037508.342789244, -32150025.59297142 ], [ -20037508.342789244, 41268657.319279306 ], [ 20037508.342789244, 41268657.319279306 ], [ 20037508.342789244, -32150025.59297142 ], [ -20037508.342789244, -32150025.59297142 ] ] ],
            extent: [-20037508.342789244, -32150025.59297142, 20037508.342789244, 41268657.319279306],
            center: [0, 4559315.863153942]
        });
    });

    it('test parseString number', () => {
        expect(parseString("10000 500000")).toEqual({x: 10000, y: 500000});
    });

    it('test parseString char', () => {
        expect(parseString("AAA00 500000")).toBe(null);
    });

    it('test getWMSBoundingBox no data', () => {
        expect(getWMSBoundingBox([])).toBe(null);
        expect(getWMSBoundingBox()).toBe(null);
    });

    it('test getWMSBoundingBox', () => {
        expect(getWMSBoundingBox([
            {
                $: {
                    SRS: 'EPSG:3857',
                    maxx: "1271911.7584765626",
                    maxy: "5459438.758476563",
                    minx: "1232776.0",
                    miny: "5420303.0"
                }
            },
            {
                $: {
                    SRS: 'EPSG:4326',
                    minx: "-180",
                    miny: "-90",
                    maxx: "180",
                    maxy: "90"
                }
            }
        ])).toEqual({
            minx: 11.074215226957271,
            miny: 43.70759642778742,
            maxx: 11.425777726908334,
            maxy: 43.96119355022118
        });
    });
    it('test fetchProjRemotely with fake url', () => {
        expect(typeof fetchProjRemotely("EPSG:3044", "base/web/client/test-resources/wms/projDef_3044.txt")).toBe("object");
        expect(fetchProjRemotely("EPSG:3044", "base/web/client/test-resources/wms/projDef_3044.txt") instanceof Promise).toBeTruthy();
    });
    it('test determineCrs', () => {
        expect(determineCrs("EPSG:4326")).toNotBe(null);
        expect(determineCrs("EPSG:3004")).toBe(null);
        expect(determineCrs({crs: "EPSG:3004"}).crs).toBe("EPSG:3004");
    });
    it('test calculateDistance', () => {
        expect(calculateDistance([[1, 1], [2, 2]], "haversine")).toNotBe(null);
        expect(calculateDistance([[1, 1], [2, 2]], "haversine")).toBe(157225.432);
        expect(calculateDistance([[1, 1], [2, 2]], "vincenty")).toBe(156876.149);
    });
    it('test calculate Geodesic Distance', () => {
        expect(FORMULAS.haversine([[1, 1], [2, 2]] )).toNotBe(null);
        expect(FORMULAS.haversine([[1, 1], [2, 2]])).toBe(157225.432);
    });
    it('test calculate vincenty Distance', () => {
        expect(FORMULAS.vincenty([[1, 1], [2, 2]] )).toNotBe(null);
        expect(FORMULAS.vincenty([[1, 1], [2, 2]] )).toBe(156876.149);
    });
    it('test transformLineToArcs', () => {
        expect(transformLineToArcs([[1, 1], [2, 2]] )).toNotBe(null);
        expect(transformLineToArcs([[1, 1], [2, 2]] ).length).toBe(100);
    });
    it('test transformLineToArcs with 2 equal points', () => {
        expect(transformLineToArcs([[1, 1], [1, 1]] )).toNotBe(null);
        expect(transformLineToArcs([[1, 1], [1, 1]] ).length).toBe(0);
    });
    it('test transformArcsToLine', () => {
        expect(transformArcsToLine(transformLineToArcs([[1, 1], [2, 2]] ))).toNotBe(null);
        expect(transformArcsToLine(transformLineToArcs([[1, 1], [2, 2]] )).length).toBe(2);
    });
    it('test getNormalizedLatLon', () => {

        let normalizedCoords = getNormalizedLatLon({lat: 45, lng: 9});
        expect(normalizedCoords).toEqual({lat: 45, lng: 9});

        normalizedCoords = getNormalizedLatLon({lat: 45, lng: 369});
        expect({lng: Math.round(normalizedCoords.lng), lat: Math.round(normalizedCoords.lat)}).toEqual({lat: 45, lng: 9});

        normalizedCoords = getNormalizedLatLon({lat: 45, lng: -351});
        expect({lng: Math.round(normalizedCoords.lng), lat: Math.round(normalizedCoords.lat)}).toEqual({lat: 45, lng: 9});

    });
    it('test isInsideVisibleArea inside', () => {

        const coords = {lat: 36.95, lng: -79.84};

        const map = {
            size: {
                width: 1581,
                height: 946
            },
            zoom: 4,
            projection: 'EPSG:3857',
            bbox: {
                bounds: {
                    maxx: -5732165,
                    maxy: 5722381,
                    minx: -9599267,
                    miny: 3408479
                },
                crs: 'EPSG:3857'
            }
        };

        const layout = {
            right: 50,
            bottom: 10
        };

        const resolution = 9783;

        const insideVisibleArea = isInsideVisibleArea(coords, map, layout, resolution);

        expect(insideVisibleArea).toBe(true);

    });

    it('test isInsideVisibleArea outside', () => {

        const coords = {lat: 36.95, lng: -79.84};

        const map = {
            size: {
                width: 1581,
                height: 946
            },
            zoom: 4,
            projection: 'EPSG:3857',
            bbox: {
                bounds: {
                    maxx: -5732165,
                    maxy: 5722381,
                    minx: -9599267,
                    miny: 3408479
                },
                crs: 'EPSG:3857'
            }
        };

        const layout = {
            left: 500,
            bottom: 250
        };

        const resolution = 9783;

        const insideVisibleArea = isInsideVisibleArea(coords, map, layout, resolution);

        expect(insideVisibleArea).toBe(false);

    });

    it('test centerToVisibleArea single bbox', () => {

        const coords = {lat: 36.95, lng: -79.84};

        const map = {
            size: {
                width: 1581,
                height: 946
            },
            zoom: 4,
            projection: 'EPSG:3857',
            bbox: {
                bounds: {
                    maxx: -5732165,
                    maxy: 5722381,
                    minx: -9599267,
                    miny: 3408479
                },
                crs: 'EPSG:3857'
            }
        };

        const layout = {
            left: 500,
            bottom: 250
        };

        const resolution = 9783;

        const newCenter = centerToVisibleArea(coords, map, layout, resolution);
        expect(newCenter.zoom).toBe(4);
        expect({x: parseFloat(newCenter.pos.x.toFixed(2)), y: parseFloat(newCenter.pos.y.toFixed(2))}).toEqual({x: -101.81, y: 27.68});
        expect(newCenter.crs).toBe('EPSG:4326');
    });

    it('test centerToVisibleArea splitted bbox, first bbox width greater than second', () => {

        const coords = {lat: 74.78, lng: 149.41};

        const map = {
            size: {
                width: 1426,
                height: 946
            },
            zoom: 3,
            projection: 'EPSG:3857',
            bbox: {
                bounds: {
                    maxx: -14020385,
                    maxy: 18393806,
                    minx: -41924181,
                    miny: -117407
                },
                crs: 'EPSG:3857'
            }
        };

        const layout = {
            right: 500,
            bottom: 0
        };

        const resolution = 19568;

        const newCenter = centerToVisibleArea(coords, map, layout, resolution);
        expect(newCenter.zoom).toBe(3);
        expect({x: parseFloat(newCenter.pos.x.toFixed(2)), y: parseFloat(newCenter.pos.y.toFixed(2))}).toEqual({x: 193.36, y: 74.78});
        expect(newCenter.crs).toBe('EPSG:4326');
    });

    it('test centerToVisibleArea splitted bbox, second bbox width greater than first', () => {

        const coords = {lat: 76.84, lng: 98.79};

        const map = {
            size: {
                width: 1426,
                height: 946
            },
            zoom: 3,
            projection: 'EPSG:3857',
            bbox: {
                bounds: {
                    maxx: 20370162,
                    maxy: 22679172,
                    minx: -7533633,
                    miny: 4167958
                },
                crs: 'EPSG:3857'
            }
        };

        const layout = {
            right: 500,
            bottom: 0
        };

        const resolution = 19568;

        const newCenter = centerToVisibleArea(coords, map, layout, resolution);
        expect(newCenter.zoom).toBe(3);
        expect({x: parseFloat(newCenter.pos.x.toFixed(2)), y: parseFloat(newCenter.pos.y.toFixed(2))}).toEqual({x: 142.74, y: 76.84});
        expect(newCenter.crs).toBe('EPSG:4326');
    });

    it("test rounding of a number 28.45", () => {
        const value = 28.45;
        const roundingBehaviour = "floor";
        const maximumFractionDigits = 0;

        const roundingOptions = {value, roundingBehaviour, maximumFractionDigits};
        const res = roundCoord(roundingOptions);
        expect(res).toBe(28);
    });
    it("test rounding of a number 28.55", () => {
        const value = 28.55;
        const roundingBehaviour = "floor";
        const maximumFractionDigits = 0;
        const roundingOptions = {value, roundingBehaviour, maximumFractionDigits};
        const res = roundCoord(roundingOptions);
        expect(res).toBe(28);
    });
    it("test rounding of a number 28.55 with fractional digits", () => {
        const value = 28.55;
        const roundingBehaviour = "floor";
        const maximumFractionDigits = 2;
        const roundingOptions = {value, roundingBehaviour, maximumFractionDigits};
        const res = roundCoord(roundingOptions);
        expect(res).toBe(28.55);
    });
    it("transformArcsToLine every 2 points", () => {
        const res = transformArcsToLine([[1, 1], [2, 2], [3, 3], [4, 4]], 2);
        expect(res).toEqual([[1, 1], [3, 3], [4, 4]]);
    });
    it('makeBboxFromOWS valid lc and uc', () => {
        const lc = [2, 2];
        const uc = [4, 4];
        expect(makeBboxFromOWS(lc, uc)).toEqual([2, 2, 4, 4]);
    });
    it('makeBboxFromOWS lower corner is upper corner and vice versa', () => {
        const lc = [4, 4];
        const uc = [2, 2];
        expect(makeBboxFromOWS(lc, uc)).toEqual([2, 2, 4, 4]);
    });
    it('makeBboxFromOWS lower right and upper left', () => {
        const lc = [4, 2];
        const uc = [2, 4];
        expect(makeBboxFromOWS(lc, uc)).toEqual([2, 2, 4, 4]);
    });
    it('extractCrsFromURN #1', () => {
        const urn = 'urn:ogc:def:crs:EPSG:6.6:4326';
        expect(extractCrsFromURN(urn)).toBe('EPSG:4326');
    });
    it('extractCrsFromURN #2', () => {
        const urn = 'urn:ogc:def:crs:EPSG::3857';
        expect(extractCrsFromURN(urn)).toBe('EPSG:3857');
    });
    it('extractCrsFromURN #3', () => {
        const urn = 'urn:ogc:def:crs:::RGF Lambert93';
        expect(extractCrsFromURN(urn)).toBe('RGF Lambert93');
    });
    it('extractCrsFromURN invalid URN', () => {
        const urn = 'urn:lex:eu:council:directive:2010-03-09';
        expect(extractCrsFromURN(urn)).toBe(null);
    });
    it('makeNumericEPSG with valid EPSG', () => {
        const epsg = 'EPSG:3857';
        expect(makeNumericEPSG(epsg)).toBe('EPSG:3857');
    });
    it('makeNumericEPSG with WGS84', () => {
        const epsg = 'EPSG:WGS84';
        expect(makeNumericEPSG(epsg)).toBe('EPSG:4326');
    });
    it('makeNumericEPSG with OGC:CRS84', () => {
        const epsg = 'EPSG:OGC:CRS84';
        expect(makeNumericEPSG(epsg)).toBe('EPSG:4326');
    });
    it('makeNumericEPSG with invalid EPSG', () => {
        const epsg = 'EPSG:84';
        expect(makeNumericEPSG(epsg)).toBe(null);
    });
    it('creates a polygon with getPolygonFromCircle defaults', () => {
        let polygon = getPolygonFromCircle();
        expect(polygon).toBe(null);
        polygon = getPolygonFromCircle([40, 15]);
        expect(polygon).toBe(null);
        polygon = getPolygonFromCircle(null, 6.13);
        expect(polygon).toBe(null);
        polygon = getPolygonFromCircle([40, 15], 6.13);
        expect(polygon).toBeTruthy();
    });
    it('creates a polygon with getPolygonFromCircle, radius in degress', () => {
        let polygon = getPolygonFromCircle([40, 15], 6.13, "degrees", 50);
        expect(polygon.geometry.coordinates[0].length).toBe(50 + 1);
        expect(polygon.geometry.coordinates[0][0][0]).toBe(40);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][0][1], 21.137162260837176)).toBe(true);
        expect(polygon.geometry.coordinates[0][50][0]).toBe(40);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][50][1], 21.137162260837176)).toBe(true);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][20][0], 36.34143838801184)).toBe(true);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][20][1], 10.00834658343667)).toBe(true);
    });
    it('creates a polygon with getPolygonFromCircle, radius in meters', () => {
        let polygon = getPolygonFromCircle([40, 15], 6000, "meters", 50);
        expect(polygon.geometry.coordinates[0].length).toBe(50 + 1);
        expect(polygon.geometry.coordinates[0][0][0]).toBe(40);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][0][1], 15.053959221823476)).toBe(true);
        expect(polygon.geometry.coordinates[0][50][0]).toBe(40);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][50][1], 15.053959221823476)).toBe(true);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][20][0], 39.96717142640955)).toBe(true);
        expect(isNearlyEqual(polygon.geometry.coordinates[0][20][1], 14.956343723081114)).toBe(true);
    });

    it('getProjections returns an array projections', () => {
        let projections = getProjections();
        expect(Array.isArray(projections)).toBe(true);
        // 2 items because there are no projectionDefs in config
        expect(projections.length).toBe(2);

        setConfigProp('projectionDefs',  [{code: "EPSG:900913", extent: [1, 2, 3, 5]}]);
        projections = getProjections();
        expect(projections.length).toBe(3);
        removeConfigProp('projectionDefs');
    });

    it('getExtentForProjection find an Extent by projection code', () => {
        const {extent} = getExtentForProjection("EPSG:3857");
        expect(extent.length).toEqual(4);

        // returns default incase projection doesnot exist
        const res = getExtentForProjection("EPSG:900913");
        expect(res.extent.length).toBe(4);
        expect(res.extent).toEqual([-20026376.39, -20048966.10, 20026376.39, 20048966.10]);
    });

    it('checkIfLayerFitsExtentForProjection out of bounds layer with crs EPSG:4326', () => {
        const geoJson = {
            bbox: {crs: "EPSG:4326"},
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-150, 94]
                },
                "properties": {
                    "prop0": "value0"
                }
            }]
        };
        const canFitWithBounds = checkIfLayerFitsExtentForProjection({name: "test", ...geoJson});
        expect(canFitWithBounds).toBe(false);
    });

    it('checkIfLayerFitsExtentForProjection within bounds layer with crs EPSG:4326', () => {
        const geoJson = {
            bbox: {crs: "EPSG:4326"},
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-150, 90]
                },
                "properties": {
                    "prop0": "value0"
                }
            }]
        };
        const canFitWithBounds = checkIfLayerFitsExtentForProjection({name: "test", ...geoJson});
        expect(canFitWithBounds).toBe(true);
    });

    it('checkIfLayerFitsExtentForProjection out of bounds layer crs projection EPSG:3857', () => {
        const geoJson = {
            bbox: {crs: "EPSG:3857"},
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-20026376, 23026376]
                },
                "properties": {
                    "prop0": "value0"
                }
            }]
        };
        const canFitWithBounds = checkIfLayerFitsExtentForProjection({name: "test", ...geoJson});
        expect(canFitWithBounds).toBe(false);
    });

    it('checkIfLayerFitsExtentForProjection within bounds layer crs projection EPSG:3857', () => {
        const geoJson = {
            bbox: {crs: "EPSG:3857"},
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [-20026376, 13026376]
                },
                "properties": {
                    "prop0": "value0"
                }
            }]
        };
        const canFitWithBounds = checkIfLayerFitsExtentForProjection({name: "test", ...geoJson});
        expect(canFitWithBounds).toBe(true);
    });
    it('test getLonLatFromPoint', ()=> {
        const [lon, lat] = getLonLatFromPoint({latlng: {lat: 40, lng: -80}});
        expect(lat).toBe(40);
        expect(lon).toBe(-80);
    });
    it('test getLonLatFromPoint with lng > +-180', ()=> {
        let [lon, lat] = getLonLatFromPoint({latlng: {lat: 40, lng: -280}});
        expect(lat).toBe(40);
        expect(lon).toBe(80);
        [lon, lat] = getLonLatFromPoint({latlng: {lat: 40, lng: 280}});
        expect(lat).toBe(40);
        expect(lon).toBe(-80);
    });
    it('test convertRadianToDegrees is within an acceptable range', ()=> {
        const deg = convertRadianToDegrees(100);
        const val = valueIsApproximatelyEqual(deg, 5729.58);
        expect(val).toBe(true);
    });
    it('test convertDegreesToRadian is within an acceptable range', ()=> {
        const rad = convertDegreesToRadian(5729.6);
        const val = valueIsApproximatelyEqual(rad, 100);
        expect(val).toBe(true);
    });
    it('test convertRadianToDegrees converts stringed radian to number', ()=> {
        const deg = convertRadianToDegrees('100');
        const val = valueIsApproximatelyEqual(deg, 5729.58);
        expect(val).toBe(true);
    });
    it('test convertDegreesToRadian converts stringed degree to number', ()=> {
        const rad = convertDegreesToRadian('5729.6');
        const val = valueIsApproximatelyEqual(rad, 100);
        expect(val).toBe(true);
    });

    describe('normalizeGeometry tests', ()=> {
        it('Test geometryChanged normalization for Point', () => {
            const geometry = {
                type: "Point",
                coordinates: [-210, 2]
            };
            const newGeom = normalizeGeometry(geometry);
            expect(newGeom).toBeTruthy();
            expect(newGeom).toNotEqual(geometry);
            expect(newGeom).toEqual({
                type: "Point",
                coordinates: [ 150, 2 ]
            });
        });
        it('Test geometryChanged normalization for LineString ', () => {
            const geometry = {
                type: "LineString",
                "coordinates": [
                    [-230.0, 10.0], [-210.0, 30.0], [-240.0, 40.0]
                ]
            };
            const newGeom = normalizeGeometry(geometry);
            expect(newGeom).toBeTruthy();
            expect(newGeom).toNotEqual(geometry);
            expect(newGeom).toEqual({
                type: "LineString",
                coordinates: [ [ 130.00000000000003, 10 ], [ 150, 30 ], [ 120, 40 ] ]
            });
        });
        it('Test geometryChanged normalization for Polygon', () => {
            const geometry = {
                type: "Polygon",
                coordinates: [
                    [[-190.0, 10.0], [-192.0, 45.0], [196.0, 40.0], [-198.0, 20.0], [-200.0, 10.0]],
                    [[200.0, 30.0], [210.0, 35.0], [-220.0, 20.0], [230.0, 30.0]]
                ]
            };
            const newGeom = normalizeGeometry(geometry);
            expect(newGeom).toBeTruthy();
            expect(newGeom).toNotEqual(geometry);
            expect(newGeom).toEqual({
                type: "Polygon",
                coordinates: [ [ [ 170, 10 ], [ 168, 45 ], [ -164.00000000000003, 40 ], [ 161.99999999999997, 20 ], [ 160, 10 ] ], [ [ -160, 30 ], [ -150, 35 ], [ 139.99999999999997, 20 ], [ -130.00000000000003, 30 ] ] ]
            });
        });

        it('Test geometryChanged normalization for MultiPoint ', () => {
            const geometry = {
                type: "MultiPoint",
                coordinates: [
                    [-210.0, 40.0], [-140.0, 30.0], [-220.0, 20.0], [-230.0, 10.0]
                ]
            };
            const newGeom = normalizeGeometry(geometry);
            expect(newGeom).toBeTruthy();
            expect(newGeom).toNotEqual(geometry);
            expect(newGeom).toEqual({
                type: "MultiPoint",
                coordinates: [ [ 150, 40 ], [ -140, 30 ], [ 139.99999999999997, 20 ], [ 130.00000000000003, 10 ] ]
            });
        });

        it('Test geometryChanged normalization for MultiLineString ', () => {
            const geometry = {
                type: "MultiLineString",
                coordinates: [
                    [[-210.0, 10.0], [-220.0, 20.0], [-210.0, 40.0]],
                    [[-189.0, 40.0], [-230.0, 30.0], [-240.0, 20.0], [230.0, 10.0]]
                ]
            };
            const newGeom = normalizeGeometry(geometry);
            expect(newGeom).toBeTruthy();
            expect(newGeom).toNotEqual(geometry);
            expect(newGeom).toEqual({
                type: "MultiLineString",
                coordinates: [ [ [ 150, 10 ], [ 139.99999999999997, 20 ], [ 150, 40 ] ],
                    [ [ 171, 40 ], [ 130.00000000000003, 30 ], [ 120, 20 ], [ -130.00000000000003, 10 ] ] ]
            });
        });

        it('Test geometryChanged normalization for MultiPolygon', () => {
            const geometry = {
                type: "MultiPolygon",
                coordinates: [
                    [
                        [[230.0, 20.0], [545.0, 40.0], [-210.0, 40.0], [330.0, 20.0]]
                    ],
                    [
                        [[-215.0, 5.0], [240.0, 10.0], [310.0, 20.0], [-205.0, 10.0], [215.0, 5.0]]
                    ]
                ]
            };
            const newGeom = normalizeGeometry(geometry);
            expect(newGeom).toBeTruthy();
            expect(newGeom).toNotEqual(geometry);
            expect(newGeom).toEqual({
                type: "MultiPolygon",
                coordinates: [ [ [ [ -130.00000000000003, 20 ], [ -175.00000000000003, 40 ], [ 150, 40 ], [ -30, 20 ] ] ], [ [ [ 145, 5 ], [ -120, 10 ], [ -50, 20 ], [ 155, 10 ], [ -145, 5 ] ] ] ]
            });
        });
    });

});
