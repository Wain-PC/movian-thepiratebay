/**
 * thepiratebay.se plugin for Showtime
 *
 *  Copyright (C) 2014-2016 Wain
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

(function (plugin) {
    var config = {
        pluginInfo: plugin.getDescriptor(),
        prefix: plugin.getDescriptor().id,
        logo: plugin.path + "logo.png",
        headers: {
            Connection: "keep-alive",
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Upgrade-Insecure-Requests": 1,
            "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.109 Safari/537.36",
            "Accept-Encoding": "gzip, deflate, sdch",
            "Accept-Language": "ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4,und;q=0.2"
        },
        regExps: {}
    };

    var service = plugin.createService(config.pluginInfo.title, config.prefix + ":start", "video", true, config.logo);
    var settings = plugin.createSettings(config.pluginInfo.title, config.logo, config.pluginInfo.synopsis);
    var html = require('showtime/html');
    settings.createInfo("info", config.logo, "Plugin developed by " + config.pluginInfo.author + ". \n");
    settings.createDivider('Settings');
    settings.createString("domain", "Домен", "thepiratebay.se", function (v) {
        service.domain = v;
    });

    config.urls = {
        base: 'http://' + service.domain
    };

    function coloredStr(str, color) {
        return '<font color="' + color + '">' + str + '</font>';
    }

    function setPageHeader(page, title) {
        if (page.metadata) {
            page.metadata.title = title;
            page.metadata.logo = config.logo;
        }
        page.type = "directory";
        page.contents = "items";
        page.loading = false;
    }

    plugin.addURI(config.prefix + ":start", function (page) {
        //Pages: browse, recent, tv shows, Music, Top 100
        var pages = [
                {
                    url: '/browse',
                    path: 'category',
                    name: 'Browse'
                },
                {
                    url: '/recent',
                    path: 'items',
                    name: 'Recent'
                },
                {
                    url: '/tv',
                    path: 'category',
                    name: 'TV Shows'
                },
                {
                    url: '/music',
                    path: 'category',
                    name: 'Music'
                },
                {
                    url: '/top',
                    path: 'category',
                    name: 'Top 100'
                }
            ],
            i, length = pages.length;
        setPageHeader(page, config.pluginInfo.synopsis);
        for (i = 0; i < length; i++) {
            page.appendItem(config.prefix + ":" + pages[i].path + ":" + pages[i].url + ':' + encodeURIComponent(pages[i].name), "directory", {
                title: pages[i].name
            });
        }
    });


    plugin.addURI(config.prefix + ":category:(.*):(.*)", function (page, url, name) {
        var dom, items, i, itemUrl;
        setPageHeader(page, decodeURIComponent(name));
        page.loading = true;
        dom = html.parse(showtime.httpReq(config.urls.base + decodeURIComponent(url)).toString());
        page.loading = false;

        //1-title, 2- HTML contents
        try {
            items = dom.root.getElementById('categoriesTable').getElementByTagName('a');
        }
        catch(err) {
           return page.redirect(config.prefix + ":items:" + url + ':' + name);
        }
        for (i = 0; i < items.length; i++) {
            itemUrl = items[i].attributes.getNamedItem('href').value;
            if (itemUrl.indexOf('browse') > -1) {
                page.appendItem(config.prefix + ":items:" + encodeURIComponent(items[i].attributes.getNamedItem('href').value) + ':' + encodeURIComponent(items[i].textContent), "directory", {
                    title: items[i].textContent
                });
            }
            else {
                page.appendItem(config.prefix + ":category:" + encodeURIComponent(items[i].attributes.getNamedItem('href').value) + ':' + encodeURIComponent(items[i].textContent), "directory", {
                    title: items[i].textContent
                });
            }
        }
    });

    plugin.addURI(config.prefix + ":items:(.*):(.*)", function (page, url, name) {
        var dom, items, i, link, linkUrl, linkTitle;
        setPageHeader(page, decodeURIComponent(name));
        page.loading = true;
        dom = html.parse(showtime.httpReq(config.urls.base + decodeURIComponent(url)).toString());
        page.loading = false;

        //1-title, 2- HTML contents
        items = dom.root.getElementById('searchResult').getElementByClassName('detName');
        for (i = 0; i < items.length; i++) {
            link = items[i].getElementByTagName('a')[0];
            linkUrl = link.attributes.getNamedItem('href').value;
            linkTitle = link.textContent;
            page.appendItem(config.prefix + ":torrent:" + encodeURIComponent(linkUrl) + ':' + encodeURIComponent(linkTitle), "directory", {
                title: linkTitle
            });
        }
    });


    plugin.addURI(config.prefix + ":torrent:(.*):(.*)", function (page, url, name) {
        var dom, items, magnetUrl, torrentTitle, torrentDescription;
        name = decodeURIComponent(name);
        setPageHeader(page, name);
        page.loading = true;
        dom = html.parse(showtime.httpReq(config.urls.base + decodeURIComponent(url)).toString());
        page.loading = false;

        magnetUrl = dom.root.getElementByClassName('download')[0].getElementByTagName('a')[0].attributes.getNamedItem('href').value;
        torrentDescription = dom.root.getElementByClassName('nfo')[0].textContent;
        console.log(magnetUrl);
        page.appendItem("torrent:browse:" + magnetUrl, "directory", {
            title: 'magnet: ' + name,
            description: torrentDescription
        });
    });


    plugin.addSearcher(plugin.getDescriptor().id, config.logo, function (page, query) {
        var url = config.urls.base + config.urls.parts.search + encodeURIComponent(query),
            nextURL, tryToSearch = true;

        page.entries = 0;
        loader();
        page.paginator = loader;

        function loader() {

        }


        function makeDescription(response) {
            var result = {
                    title: "",
                    href: "",
                    topicId: "",
                    size: "0",
                    seeders: "0",
                    leechers: "0"
                },
            //1-номер темы, 2-относительная ссылка на тему, 3-название
                nameMatch = config.regExps.search.name.exec(response),
            //1-размер, 2-сидеры, 3-личеры
                infoMatch = config.regExps.search.info.exec(response);

            if (nameMatch) {
                result.title = nameMatch[3];
                result.href = nameMatch[2];
                result.topicId = nameMatch[1];
            }
            if (infoMatch) {
                result.size = infoMatch[1];
                result.seeders = infoMatch[2];
                result.leechers = infoMatch[3];
            }
            //сформируем готовую строку с описанием торрента
            result.description = coloredStr('Название: ', config.colors.orange) + result.title + "<br>";
            result.description += coloredStr('Размер: ', config.colors.blue) + result.size + "<br>";
            result.description += coloredStr('Сидеры: ', config.colors.green) + result.seeders + "<br>";
            result.description += coloredStr('Личеры: ', config.colors.red) + result.leechers + "<br>";
            result.description = new showtime.RichText(result.description);
            return result;
        }

    });


})(this);