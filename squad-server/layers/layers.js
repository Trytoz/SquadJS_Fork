import axios from 'axios';

import Logger from 'core/logger';

import Layer from './layer.js';

class Layers {
    constructor() {
        this.layers = [];

        this.pulled = false;
    }

    async pull(force = false) {
        if (this.pulled && !force) {
            Logger.verbose('Layers', 2, '已经拉取过地图图层信息.');
            return;
        }
        if (force) Logger.verbose('Layers', 1, '强制更新地图图层信息...');

        this.layers = [];

        Logger.verbose('Layers', 1, '正在拉取地图图层信息...');
        Logger.verbose('Layers.url:', 1, 'https://raw.gitmirror.comSquad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json')
        const response = await axios.get(
            'https://raw.gitmirror.comSquad-Wiki/squad-wiki-pipeline-map-data/master/completed_output/_Current%20Version/finished.json'
        );

        for (const layer of response.data.Maps) {
            this.layers.push(new Layer(layer));
        }

        Logger.verbose('Layers', 1, `Pulled ${this.layers.length} layers.`);

        this.pulled = true;

        return this.layers;
    }

    async getLayerByCondition(condition) {
        await this.pull();

        const matches = this.layers.filter(condition);
        if (matches.length === 1) return matches[0];

        return null;
    }

    getLayerById(layerId) {
        return this.getLayerByCondition((layer) => layer.layerid === layerId);
    }

    getLayerByClassname(classname) {
        return this.getLayerByCondition((layer) => layer.classname === classname);
    }
}

export default new Layers();
