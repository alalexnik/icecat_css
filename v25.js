// ==UserScript==
// @name        Alex for IceCat 2025 working
// @namespace   IceCat Scripts
// @version     2025
// @grant       none
// ==/UserScript==

(async () => {
    // Объект для хранения данных страницы
    const pageData = {
        version: '18.03.2025', // Версия скрипта
        gallery: false, // Флаг для галереи
        general: false, // Флаг для общих данных
        description: false, // Флаг для описания
        features: false, // Флаг для характеристик
        category: false, // Флаг для категории
        category_page: false, // Флаг для категории
        check: false, // Флаг для проверки
        checkFeatures: {} // Объект для проверки характеристик
    };
    window.pageData = pageData; // Сохраняем данные страницы в глобальной области видимости

    // Парсим параметры URL и сохраняем их в pageData
    location.search.substr(1).split(';').forEach((item) => {
        if (item.split('=')[0] === 'tmpl') {
            pageData.tmpl = item.split('=')[1].split('.')[0]; // Шаблон страницы
        }
        if (item.split('=')[0] === 'product_id') {
            pageData.productID = item.split('=')[1].split('.')[0]; // ID продукта
        }
        if (item.split('=')[0] === 'sessid') {
            pageData.sessid = item.split('=')[1].split('.')[0]; // ID сессии
        }
    });

    // Добавляем стили для верхнего статус-бара
    document.head.insertAdjacentHTML('beforeend', `<style>
    #top-status-bar {
      position: absolute;
      top: 0;
      right: 0;
      padding-top: 9px;
      padding-right: 100px;
    }</style>`);

    // Функция для загрузки JavaScript файлов
    const js = (url) => {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = url;
            script.async = true;
            script.onload = () => {
                resolve();
            };
            document.getElementsByTagName('head')[0].appendChild(script);
        });
    };

    // Функция для загрузки CSS файлов
    const css = (url) => {
        const link = document.createElement('link');
        link.href = url;
        link.rel = 'stylesheet';
        document.getElementsByTagName('head')[0].appendChild(link);
    };

    // Функция для получения данных пользователя
    const getUser = async () => {
        const response = await fetch(`https://bo.icecat.biz/restful/v3/Users?Type=Info&AccessKey=${pageData.sessid}`);
        if (response.ok) {
            const json = await response.json();
            pageData.user = json.Data.Login; // Логин пользователя
            pageData.group = json.Data.UserGroup; // Группа пользователя
        } else {
            console.log(`User error: ${response.status}`);
        }
    };

    // Основная функция для работы с продуктом
    const product = (userGruop) => {
        // Функция для изменения атрибутов форм
        const forms = () => {
            document.querySelectorAll('form').forEach((elem) => {
                elem.setAttribute('name', 'NoFormName'); // Устанавливаем имя формы
            });
        };

        // Функция для получения общих данных о продукте
        const getGeneral = async () => {
            const response = await fetch(`https://bo.icecat.biz/restful/v3/Product/${pageData.productID}?AccessKey=${pageData.sessid}`);
            if (response.ok) {
                const json = await response.json();
                pageData.category = json.Data.Category.CategoryName; // Категория продукта
                pageData.brand = json.Data.Brand.BrandName; // Бренд продукта
                console.log(`Get general ok: ${response.status}`);
            } else {
                console.log(`Get general error: ${response.status}`);
            }
        };

        const page_category_fun = (attempts = 0) => {
            if (!pageData.category_page || !document.getElementsByClassName('category_page').length) {
                console.log('-------------------------------------- in page_category');
                const spanElement = document.querySelector('span[title="Please, type the category name to select the right item"]');

                if (spanElement) {
                    // Ищем input через цепочку parentElement с проверками
                    const inputElement = spanElement.parentElement?.parentElement?.parentElement?.querySelector('input');

                    if (inputElement) {
                        // Добавляем класс category_page
                        inputElement.classList.add('category_page');
                        console.log('Класс "category_page" успешно добавлен.');
                        pageData.category_page = inputElement.value;
                        console.log('pageData.category_page:', pageData.category_page);
                        if (pageData.category_page && pageData.category !== pageData.category_page) {
                            console.log('----- Категория продукта изменена! -----');

                            // Обновляем категорию в pageData
                            pageData.category = pageData.category_page;

                            // Перезапускаем проверку характеристик
                            setTimeout(general, 2000)
                            setTimeout(() => {
                                document.querySelectorAll('#productFeatures .form-control').forEach((item) => {
                                    if (item.value) {
                                        item.classList.add('saved');
                                    }
                                });

                                checkFeatures('start');
                                document.getElementById('feature-found').innerText = checkFeatures('found');
                                document.getElementById('feature-saved').innerText = checkFeatures('saved');

                                console.log('Проверка характеристик завершена через 3 секунды.');
                            }, 3000);

                        }

                    } else {
                        console.log('Элемент <input> не найден.');
                    }
                } else {
                    if (attempts < 5) { // Ограничение на 5 попыток
                        console.log('Элемент <span> с указанным title не найден. Повторная попытка через 2 секунды...');

                        // Перезапуск функции через 2 секунды
                        setTimeout(() => page_category_fun(attempts + 1), 2000);
                    } else {
                        console.log('Превышено количество попыток. Элемент <span> не найден.');
                    }
                }
            }
        };

        // Функция для работы с характеристиками продукта
        const features = async () => {
            try {
                await getGeneral();
                forms();
                document.querySelectorAll('#productFeatures .form-control').forEach((elem) => {
                    elem.setAttribute('id', `_rotate_value_${elem.getAttribute('data-category-feature-id')}`); // Устанавливаем ID для элементов характеристик
                    if (elem.classList.contains('multiple')) {
                        elem.insertAdjacentHTML('beforebegin', `<a id="_del_${elem.getAttribute('data-category-feature-id')}" class="removeAll _del-all-specs" href="#" title="Delete all features">x</a>`); // Добавляем кнопку удаления всех характеристик
                    }
                });
            } catch (err) {
                console.log(err);
            } finally {
                if (document.querySelector('#productFeatures .form-control') && document.querySelector('#productFeatures .form-control').hasAttribute('id')) {
                    pageData.features = true; // Устанавливаем флаг, что характеристики добавлены
                    checkFeatures('start');
                    console.log('IDs added');
                } else if (pageData.category === 'Not Categorized') {
                    pageData.features = true;
                    console.log('Category is "Not Categorized"');
                } else {
                    setTimeout(features, 3e3); // Повторяем попытку через 1 секунду
                }
            }
        };

        // Функция для работы с галереей изображений
        const gallery = () => {
            try {
                const addButton = document.querySelector('#productMMO + div button[title="Add"]');
                if (addButton) {
                    addButton.id = 'image_open_button'; // Устанавливаем ID для кнопки добавления изображений
                    const parentDiv = addButton.parentNode;
                    addButton.parentNode.parentNode.style.removeProperty('height');
                    parentDiv.insertAdjacentHTML('afterend', '<button type="button"' +
                        ' id="delete-images" class="kh-btn kh-btn-info" style="margin: 20px auto;display: block">Delete all' +
                        ' images</button>'); // Добавляем кнопку удаления всех изображений
                    document.querySelector('#delete-images').addEventListener('click', async () => {
                        if (confirm('Delete all images?')) {
                            const getImages = await fetch(`https://bo.icecat.biz/restful/v3/Gallery/${pageData.productID}?AccessKey=${pageData.sessid}`);
                            if (getImages.ok) {
                                let done = 0;
                                const json = await getImages.json();
                                for (const item of json.Data) {
                                    let image = item.Low.Link.split('?')[0];
                                    await fetch(`https://bo.icecat.biz/restful/v3/Gallery/${pageData.productID}/${item.Locales[0].GalleryId}?AccessKey=${pageData.sessid}`, {method: 'DELETE'}).then(() => {
                                        ++done;
                                        if (json.Data.length === done) {
                                            toastr.success('All pictures are deleted', 'Success!', {
                                                'positionClass': 'toast-top-right',
                                                'timeOut': 5000,
                                                'extendedTimeOut': 1000
                                            }); // Уведомление об успешном удалении изображений
                                        }
                                    });
                                }
                            }
                        }
                    });
                }

                forms();
            } catch (err) {
                console.log(err);
            } finally {
                if (document.querySelector('#image_open_button')) {
                    pageData.gallery = true; // Устанавливаем флаг, что галерея добавлена
                    console.log('Gallery added');
                } else {
                    setTimeout(gallery, 3e3); // Повторяем попытку через 1 секунду
                }
            }
        };

        // Функция для работы с описанием продукта
        const description = () => {
            try {
                // Проверяем, существует ли уже кнопка с ID "mergeLinesButton"
                let existingButton = document.getElementById('mergeLinesButton');

                if (!existingButton && Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'no double spaces')) {
                    // Находим кнопку с текстом "no double spaces"
                    let button = Array.from(document.querySelectorAll('button')).find(el => el.textContent === 'no double spaces');

                    // Создаем новую кнопку
                    let newButton = document.createElement('button');
                    newButton.textContent = 'merge lines'; // Текст кнопки
                    newButton.className = button.className; // Копируем классы
                    newButton.type = button.type; // Копируем тип кнопки
                    newButton.tabIndex = button.tabIndex; // Копируем tabindex
                    newButton.id = 'mergeLinesButton'; // Присваиваем ID

                    // Добавляем функционал для объединения строк
                    newButton.addEventListener('click', function() {
                        let textarea = document.getElementById('long_desc');
                        if (textarea) {
                            // Получаем выделенный текст
                            let start = textarea.selectionStart;
                            let end = textarea.selectionEnd;
                            let selectedText = textarea.value.substring(start, end);

                            // Удаляем переносы строк и двойные пробелы
                            let mergedText = selectedText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

                            // Вставляем обратно в текстовое поле
                            textarea.value = textarea.value.substring(0, start) + mergedText + textarea.value.substring(end);

                            // Устанавливаем фокус и выделяем текст
                            setTimeout(() => {
                                textarea.focus(); // Возвращаем фокус на текстовое поле
                                textarea.setSelectionRange(start, start + mergedText.length); // Обновляем выделение
                            }, 0); // Задержка 0 для выполнения после перерисовки
                        }
                    });

                    // Вставляем новую кнопку после найденной
                    button.parentNode.insertBefore(newButton, button.nextSibling);
                }

                // Добавляем ID для элементов Description
                if(!(window.document.querySelector('#productDescription .react-select__dropdown-indicator').hasAttribute('id'))) {
                    window.document.querySelector('#productDescription .react-select__dropdown-indicator').id = 'lang_select';
                }
                if ((document.querySelectorAll("#productDescription input:not([autocomplete])").length === 3) &&
                    (!document.querySelectorAll("#productDescription input:not([autocomplete])")[2].hasAttribute('id'))) {
                    document.querySelectorAll("#productDescription input:not([autocomplete])")[0].id = 'short_desc';
                    document.querySelectorAll("#productDescription input:not([autocomplete])")[1].id = 'official_url';
                    document.querySelectorAll("#productDescription input:not([autocomplete])")[1].setAttribute('type', 'url');
                    document.querySelectorAll("#productDescription input:not([autocomplete])")[2].id = 'warr_note';
                    document.querySelectorAll('#productDescription textarea')[1].setAttribute('NAME', 'bullet_points');
                    document.querySelectorAll('#productDescription textarea')[1].setAttribute('rows', '5');
                    document.querySelectorAll('#productDescription textarea')[1].id = 'bullet_points';
                    document.querySelectorAll('#productDescription textarea')[0].id = 'long_desc';
                }
                if ((document.querySelectorAll("#productDescription input:not([autocomplete])").length === 6) &&
                    (!document.querySelectorAll("#productDescription input:not([autocomplete])")[5].hasAttribute('id'))) {
                    document.querySelectorAll("#productDescription input:not([autocomplete])")[3].id = 'seo_title';
                    document.querySelectorAll("#productDescription input:not([autocomplete])")[4].id = 'seo_description';
                    document.querySelectorAll("#productDescription input:not([autocomplete])")[5].id = 'seo_keywords';
                    document.querySelectorAll('#productDescription textarea')[2].id = 'disclaimer';
                    document.querySelectorAll('#productDescription textarea')[3].id = 'middle_desc';
                    console.log('ID added for SEO, Disclaimer, Short marketing text');
                }
                const addButton = [...document.querySelectorAll('#productDescription button')]
                    .filter(button => button.textContent.trim() === 'Add')[0];
                if (addButton) {
                    addButton.id = 'addDescription';
                }

                // переместим кнопку ММО
                // Находим кнопку "Add"
                const mmoOpenButton = [...document.querySelectorAll('#productMMO a')].find(a => a.textContent === 'Add');

                if (mmoOpenButton) {
                    mmoOpenButton.id = 'mmo_open_button';
                    mmoOpenButton.className = ''; // Очищаем все классы
                    const innerDiv = mmoOpenButton.querySelector('div');
                    if (innerDiv) {
                        innerDiv.className = ''; // Очищаем все классы
                    }
                    // 4) Устанавливаем стили: оранжевый цвет, размеры 100x30
                    mmoOpenButton.style.backgroundColor = 'orange'; // Оранжевый цвет фона
                    mmoOpenButton.style.color = '#000'; // Белый цвет текста
                    mmoOpenButton.style.width = '100px'; // Ширина
                    mmoOpenButton.style.height = '30px'; // Высота
                    mmoOpenButton.style.border = 'none'; // Убираем границу
                    mmoOpenButton.style.borderRadius = '5px'; // Закругляем углы
                    mmoOpenButton.style.textAlign = 'center'; // Выравниваем текст по центру
                    mmoOpenButton.style.lineHeight = '30px'; // Выравниваем текст по вертикали
                    mmoOpenButton.style.cursor = 'pointer'; // Меняем курсор на указатель
                    mmoOpenButton.style.fontWeight = 'bold';

                    // 5) Добавляем внешние отступы (margin) вокруг кнопки
                    mmoOpenButton.style.margin = '10px 30px 10px 0'; // Отступы вокруг кнопки

                    // 6) Сдвигаем к правому краю
                    mmoOpenButton.style.marginLeft = 'auto'; // Сдвигаем вправо
                    mmoOpenButton.style.display = 'block'; // Делаем блочным элементом

                } else {
                    console.log('Элемент "Add MMO" не найден.');
                }

            } catch (err) {
                console.log(err);
            } finally {
                if (document.querySelector('#short_desc') && document.querySelector('#lang_select')
                    && document.querySelector('#official_url') && document.querySelector('#bullet_points')
                    && document.querySelector('#long_desc') && document.querySelector('#addDescription')) {
                    pageData.description = true; // Устанавливаем флаг, что описание добавлено
                    console.log('Description added');
                } else {
                    setTimeout(description, 3e3); // Повторяем попытку через 1 секунду
                }
            }
        };

        // Функция для добавления ID характеристикам
        function addSpecsID (){
            document.querySelectorAll('#productFeatures .form-control').forEach((elem) => {
                elem.setAttribute('id', `_rotate_value_${elem.getAttribute('data-category-feature-id')}`);
                if (elem.classList.contains('multiple')) {
                    elem.insertAdjacentHTML('beforebegin', `<a id="_del_${elem.getAttribute('data-category-feature-id')}" class="removeAll _del-all-specs" href="#" title="Delete all features">x</a>`);
                }
            });
        }

        // Функция для нормализации ID
        function normalizeID(id) {
            if (!/^[a-zA-Z_]/.test(id)) {
                id = '_' + id;
            }
            id = id.replace(/[^a-zA-Z0-9_]/g, '_');
            let counter = 1;
            let originalId = id;
            while (document.getElementById(id)) {
                id = originalId + '_' + counter;
                counter++;
            }
            return id;
        }

        // Функция для работы с общими данными продукта
        const general = () => {
            try {
                // Добавление ID для Virtual category
                if (document.getElementById('productGeneral').textContent.includes('Virtual category')) {
                    if (!window.document.querySelectorAll('#productGeneral [type="checkbox"]')[0].hasAttribute('id')
                        || (window.document.querySelectorAll('#productGeneral [type="checkbox"]')[0].id === '')){
                        document.querySelectorAll('#productGeneral [type="checkbox"]').forEach((item) => {
                            if ((!item.hasAttribute('id') || (item.id === '')) && item.closest('label')) {
                                const secondChild = item.closest('label');
                                if (secondChild && secondChild.textContent) {
                                    const normalizedIds = normalizeID(secondChild.textContent).toLowerCase();
                                    item.setAttribute('id', normalizedIds);
                                }
                            }
                        });
                        console.log('Virtual category IDs added');
                    }
                } else {console.log('This product does not have Virtual Categories');}

                let rows = document.querySelectorAll('#productGeneral .flex');
                rows.forEach(row => {
                    const firstDiv = row.querySelector('div');
                    if (!firstDiv) return;

                    if (firstDiv.textContent === '*Product model description') {
                        const input = row.querySelector('input');
                        if (input && !input.id) {
                            input.id = 'product-model-name-int';
                            input.style.paddingLeft = '7px';
                        }
                    } else if (firstDiv.textContent === '*Product family') {
                        const input = row.querySelector('[id^=down]');
                        if (input && !input.name) {
                            input.name = '_family';
                            input.style.paddingLeft = '7px';
                        }
                        const sibling = input?.parentNode?.parentNode?.nextSibling;
                        if (sibling && !sibling.id) {
                            sibling.id = 'family_btn';
                        }
                    } else if (firstDiv.textContent === 'Product series') {
                        const input = row.querySelector('[id^=down]');
                        if (input && !input.name) {
                            input.name = '_series';
                            input.style.paddingLeft = '7px';
                        }
                        const sibling = input?.parentNode?.parentNode?.nextSibling;
                        if (sibling && !sibling.id) {
                            sibling.id = 'series_btn';
                        }
                    } else if (row.querySelector('[title="Please, type the brand name to select the right item"]')) {
                        const brandInput = row.querySelector('#downshift-1-input') || row.querySelector('[style="width: calc(100% - 50px);"]');
                        if (brandInput) {
                            brandInput.classList.add('brand_name');
                        }
                    }
                });

                // Левая панель
                const completenessElement = document.querySelector('[title="Health Score"]');
                if (completenessElement) {
                    const parentElement = completenessElement.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode;
                    if (parentElement) {
                        parentElement.style.position = 'fixed';
                        parentElement.style.top = '255px';
                        parentElement.id = 'left-navi-panel';
                    }
                }

                //Проверка-----------------------------------------------------------------------------------------------------

                if (document.getElementById('product-model-name-int') === null || document.querySelector('.brand_name') === null){
                    console.log('point 11')
                    setTimeout(general, 2000);
                }

                //Проверка наличия ID у family_btn, series_btn
                if (document.getElementById('family_btn') === null){
                    const rows = document.querySelectorAll('#productGeneral .flex div');
                    rows.forEach(element => {
                        if (element.textContent.trim() === '*Product family') {
                            console.log('point 12')
                            setTimeout(general, 2000);
                        }
                    });
                }
                if (document.getElementById('series_btn') === null){
                    const rows = document.querySelectorAll('#productGeneral .flex div');
                    rows.forEach(element => {
                        if (element.textContent.trim() === 'Product series') {
                            console.log('point 13')
                            setTimeout(general, 2000);
                        }
                    });
                }

                //Проверка наличия ID у Virtual category
                const chkVirt = document.querySelectorAll('#productGeneral [type="checkbox"]');
                if (chkVirt.length > 1 && (!chkVirt[chkVirt.length-2].hasAttribute('id') || chkVirt[chkVirt.length-2].id === '')){
                    console.log('MutationObserver point 14')
                    setTimeout(general, 2000);
                }


                // Кнопка копирования product-partcode
                // if (!document.querySelector('#copy-partcode')) {
                //     document.querySelectorAll('#productGeneral .feature-label').forEach((item) => {
                //         if (/product code/gmi.test(item.innerText)) {
                //             let partcode = item.parentNode.parentNode.querySelector('div:last-child');
                //             partcode.querySelectorAll('span, input')[0].classList.add('product-partcode');
                //             partcode.querySelectorAll('span, input')[0].style.display = 'inline-block';
                //             partcode.insertAdjacentHTML('afterbegin', `<button id="copy-partcode" title="Copy product code">Copy</button>`);
                //             document.querySelector('#copy-partcode').addEventListener('click', (event) => {
                //                 window.getSelection().removeAllRanges();
                //                 let partcode = document.querySelector('.product-partcode');
                //                 let range = document.createRange();
                //                 range.selectNode(partcode);
                //                 window.getSelection().addRange(range);
                //                 try {
                //                     let successful = document.execCommand('copy');
                //                     if (successful) {
                //                         toastr.success('Copy was successful', 'Partcode', {
                //                             'timeOut': 5000,
                //                             'extendedTimeOut': 1000
                //                         });
                //                     } else {
                //                         toastr.error('Copy was unsuccessful', 'Partcode', {
                //                             'timeOut': 5000,
                //                             'extendedTimeOut': 1000
                //                         });
                //                     }
                //                 } catch (err) {
                //                     console.log(err);
                //                 } finally {
                //                     window.getSelection().removeAllRanges();
                //                 }
                //             });
                //         }
                //     });
                // }
            } catch (err) {
                console.log(err);
            } finally {
                if (document.querySelector('#left-navi-panel')) {
                    console.log('General added');
                    pageData.general = true;
                } else {
                    setTimeout(general, 3e3); // Повторяем попытку через 3 секунду
                }
            }
        };

        // Функция для работы с MMO (Multimedia Objects)
        const mmo = () => {
            console.log('in mmo');
            if (!window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator')[1].hasAttribute('id')){
                window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator')[1].parentNode.id='mmo_lang_select';
            }
            if (!window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator')[0].hasAttribute('id')){
                window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator')[0].parentNode.id='mmo_type_select';
            }
            if(window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator').length === 3) {
                if (!window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator')[1].hasAttribute('id')){
                    window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator')[1].parentNode.id='mmo_lang_select';
                }
                window.document.querySelectorAll('#productMMO .react-select__dropdown-indicator')[2].parentNode.id='mmo-short-desc-type';
            }
            if (window.document.querySelectorAll('.mmo-window select')[0] &&
                (!window.document.querySelectorAll('.mmo-window select')[0].hasAttribute('id'))) {
                window.document.querySelectorAll('.mmo-window select')[0].id = 'mmo-type';
            }

            if (window.document.querySelector('.mmo-window [placeholder="URL"]') &&
                (!window.document.querySelector('.mmo-window [placeholder="URL"]').hasAttribute('id'))) {
                window.document.querySelector('.mmo-window [placeholder="URL"]').id = 'mmo-url-select';
            }
            if (window.document.querySelector('.mmo-window button') && (!window.document.querySelector('.mmo-window button').hasAttribute('id'))) {
                window.document.querySelector('.mmo-window button').id = 'mmo-add-button';
            }
            if (window.document.querySelectorAll('.mmo-window input').length === 10 && (!window.document.querySelectorAll('.mmo-window input')[4].hasAttribute('id'))) {
                window.document.querySelectorAll('.mmo-window input')[4].id = 'mmo-short-desc';
            }
            if (window.document.querySelectorAll('.mmo-window input').length === 12 && (window.document.querySelector('#mmo_type_select').previousElementSibling.firstChild.textContent === 'other digital assets') && (!window.document.querySelectorAll('.mmo-window input')[6].hasAttribute('id'))) {
                window.document.querySelectorAll('.mmo-window input')[6].id = 'mmo-short-desc';
            }
            let checkbox_mmo = document.querySelector('.mmo-window input[type="checkbox"]');
            if (checkbox_mmo && !checkbox_mmo.id) {
                checkbox_mmo.id = "mmo_keep_as_url";
            }
            console.log('IDs for MMO added');
        };

        // Функция для получения причин (RTBs)
        const getReasons = async () => {
            const response = await fetch(`https://bo.icecat.biz/restful/v3/ProductBullet/${pageData.productID}?AccessKey=${pageData.sessid}`);
            if (response.ok) {
                const json = await response.json();
                if (json.Data.length) {
                    toastr.success(json.Data.length, 'RTBs');
                } else {
                    toastr.warning('Not found', 'RTBs');
                }
            } else {
                console.log(`RTBs error: ${response.status}`);
            }
        };

        // Функция для проверки статуса изображений
        const ckeckImages = (target) => {
            if (/picture.+uploaded/gmi.test(target.innerText)) {
                if (!document.querySelector('#image-uploaded')) {
                    if (document.querySelector('#image-deleted')) {
                        document.querySelectorAll('.toast').forEach((item) => {
                            if (item.contains(document.querySelector('#image-deleted'))) {
                                item.querySelector('.toast-close-button').click();
                            }
                        });
                    }
                    toastr.success(`<span id="image-uploaded">${target.innerText.split('\n')[1]}</span>`, 'Images status');
                } else {
                    document.querySelector('#image-uploaded').innerText = target.innerText.split('\n')[1];
                }
            } else if (/picture.+deleted/gmi.test(target.innerText)) {
                if (!document.querySelector('#image-deleted')) {
                    if (document.querySelector('#image-uploaded')) {
                        document.querySelectorAll('.toast').forEach((item) => {
                            if (item.contains(document.querySelector('#image-uploaded'))) {
                                item.querySelector('.toast-close-button').click();
                            }
                        });
                    }
                    toastr.warning(`<span id="image-deleted">${target.innerText.split('\n')[1]}</span>`, 'Images status');
                } else {
                    document.querySelector('#image-deleted').innerText = target.innerText.split('\n')[1];
                }
            }
        };

        // Функция для проверки характеристик
        const checkFeatures = (type) => {
            if (type === 'start') {
                pageData.check = true;
                if (!document.getElementById('feature-found')) {
                    toastr.success('found: <span id="feature-found"></span> / saved: <span id="feature-saved"></span>', 'Features');
                }
                document.getElementById('feature-found').innerText = checkFeatures('add');
                document.getElementById('feature-saved').innerText = checkFeatures('saved');
                document.querySelectorAll('#productFeatures .counter').forEach((item) => {
                    item.classList.remove('hidden');
                });
            } else if (type === 'saved') {
                let values = 0;
                if (document.querySelector('#productFeatures .saved')) {
                    values = document.querySelectorAll('#productFeatures .saved').length;
                }
                return values;
            } else if (type === 'add') {
                let values = 0;
                document.querySelectorAll('#productFeatures .form-control').forEach((item) => {
                    if (item.value) {
                        item.classList.add('saved');
                        values++;
                    }
                });
                return values;
            } else if (type === 'found') {
                let values = 0;
                document.querySelectorAll('#productFeatures .form-control').forEach((item) => {
                    if (item.value) {
                        values++;
                    }
                });
                return values;
            }
        };

        // Функция для плавной прокрутки к элементу
        const scroll = (elem) => {
            document.getElementById(elem).scrollIntoView({block: 'end', behavior: 'smooth'});
        };

        // Наблюдатель за изменениями DOM
        // Флаг для блокировки повторных вызовов addSpecsID()
        let isCooldown = false;

        const observer = () => {
            new MutationObserver((mutations) => {
                mutations.forEach((item) => {
                    console.log('In observer 1');

                    // Удаление высоты блока с картинками, если она задана
                    const imageOpenButton = document.getElementById('image_open_button');
                    if (imageOpenButton && imageOpenButton.parentNode.parentNode.style.height) {
                        imageOpenButton.parentNode.parentNode.style.removeProperty('height');
                    }

                    // Проверка добавления элементов с классом 'feature-wrapper' в контейнеры 'main row' и 'row secondary'
                    if ((item.target.getAttribute('class') === 'main row' ||
                            item.target.getAttribute('class') === 'row secondary') &&
                        item.addedNodes.length &&
                        item.addedNodes[0].classList.contains('feature-wrapper') &&
                        pageData.features) {
                        console.log('MutationObserver point 1');
                        features();
                    }

                    // Проверка наличия изменений в таблице 'basic-table' или в окне 'mmo-window'
                    if ((item.target.classList.contains('basic-table') && item.addedNodes.length) ||
                        (window.document.querySelectorAll('.mmo-window input').length > 1)) {
                        console.log('MutationObserver point 2');
                        mmo();
                    }

                    // Обновление блока general, если изменяются определённые ID
                    if ((item.target.hasAttribute('id') &&
                            (item.target.getAttribute('name') === '_family' ||
                                item.target.getAttribute('name') === '_series' ||
                                item.target.getAttribute('id') === 'productName')) &&
                        pageData.general &&
                        (!document.querySelector('#_family') || !document.querySelector('#_series'))) {
                        console.log('MutationObserver point 3');
                        general();
                    }

                    // Обновление информации о продукте в разделе 'description'
                    if ((document.querySelector('#productDescription').contains(item.target) &&
                            item.target.matches('tbody') &&
                            pageData.description && item.addedNodes.length) ||
                        !document.querySelector('#lang_select')) {
                        console.log('MutationObserver point 4');
                        description();
                    }

                    // Проверка уведомлений об успешном сохранении данных (toastr)
                    if (item.target.getAttribute('class') === 'toastr animated rrt-success fadeIn') {
                        console.log('MutationObserver point 5');
                        ckeckImages(item.target);
                    }
                    if (!document.getElementsByClassName('category_page').length) {
                        page_category_fun();
                        console.log('MutationObserver point - category_page not found');
                    }

                    // --- Throttle для addSpecsID() ---
                    if (!isCooldown) { // Проверяем, можно ли выполнять эту часть кода
                        const formControls = document.querySelectorAll('#productFeatures .form-control');
                        if (formControls.length > 0) {
                            console.log('MutationObserver point 6');
                            const lastFormControl = formControls[formControls.length - 1]; // Последний элемент

                            // Проверяем, есть ли у него ID
                            if (!lastFormControl.id) {
                                console.log('MutationObserver point 7');
                                addSpecsID();
                                console.log('ID added for Specs Block.');
                            }
                        }

                        //Проверка Family


                        // Устанавливаем флаг троттлинга
                        isCooldown = true;

                        // Сброс флага через 2 секунды
                        setTimeout(() => {
                            isCooldown = false;
                        }, 2000);
                    }

                    // --- Конец Throttle ---

                    // Присваивание ID полю "Pictures URL", если он отсутствует
                    if (window.document.querySelector('.gallery-modal-content') &&
                        (!window.document.querySelector('[placeholder="Pictures URL"]').hasAttribute('id'))) {
                        window.document.querySelector('[placeholder="Pictures URL"]').id = 'images-urls';
                        console.log('PICS OPEN');
                    }

                    // Проверка изменений в блоке productFeatures
                    if (document.querySelector('#productFeatures').contains(item.target) && pageData.check) {
                        if (item.target.classList.contains('success') && item.target.value !== '' && !item.target.classList.contains('saved')) {
                            item.target.classList.add('saved');
                        } else if (item.target.classList.contains('success') && item.target.value === '' && item.target.classList.contains('saved')) {
                            item.target.classList.remove('saved');
                        }
                        document.getElementById('feature-found').innerText = checkFeatures('found');
                        document.getElementById('feature-saved').innerText = checkFeatures('saved');

                        // Обработка ошибок (error)
                        if (item.target.classList.contains('error') || (item.oldValue && /error/g.test(item.oldValue))) {
                            if (!document.getElementById('errors')) {
                                toastr.error('<div id="errors"></div>', 'Features not saved');
                                document.getElementById('errors').addEventListener('click', (event) => {
                                    document.getElementById(event.target.id).scrollIntoView({
                                        block: 'end',
                                        behavior: 'smooth'
                                    });
                                });
                            }

                            // Если ошибок больше нет, закрываем уведомление
                            if (!document.querySelectorAll('.error').length) {
                                document.querySelectorAll('.toast').forEach((item) => {
                                    if (item.contains(document.querySelector('#errors'))) {
                                        item.querySelector('.toast-close-button').click();
                                    }
                                });
                            }

                            // Очищаем список ошибок и заново добавляем ошибки
                            if (document.getElementById('errors')) {
                                document.getElementById('errors').innerHTML = '';
                            }
                            document.querySelectorAll('.error').forEach((item) => {
                                document.getElementById('errors').insertAdjacentHTML('afterbegin',
                                    `<span id="${item.getAttribute('id')}" class="error-item">${item.parentNode.parentNode.parentNode.querySelector('label').innerText}<span>`);
                            });
                        }
                    }

                    // Удаление высоты блока с картинками (повторная проверка)
                    if (document.getElementById('image_open_button').parentNode && document.getElementById('image_open_button').parentNode.getAttribute('style')) {
                        console.log('MutationObserver point 9');
                        const targetElement = document.getElementById('image_open_button').parentNode;
                        targetElement.setAttribute('style', 'height:auto');
                    }

                });
            }).observe(document.querySelector('#react-app'), {
                childList: true,        // Отслеживаем добавление/удаление элементов
                subtree: true,          // Следим за изменениями во всех вложенных элементах
                attributes: true,       // Следим за изменениями атрибутов
                attributeOldValue: true,// Сохраняем старые значения атрибутов
                attributeFilter: ['class'] // Ограничиваем отслеживание только изменениями class
            });
        };


        // Основная функция для запуска всех процессов
        (async () => {
            try {
                await getGeneral();
                await observer();
                general();
                description();
                await gallery();
                await features();
                page_category_fun();
                if (pageData.brand === 'HP' || pageData.brand === 'DELL' || pageData.brand === 'Alienware' || pageData.brand === 'Dell Wyse') {
                    await getReasons();
                }
            } catch (error) {
                console.error(error);
            }
        })();
    };

    // Функция для работы со списком пользователей
    const userList = () => {
        const links = () => {
            try {
                document.querySelectorAll('#main_table .info_bold').forEach(item => {
                    item.classList.add('modified');
                    const link = item.querySelector('[id^=actions] a'),
                        brand = item.querySelector('[id^=supplier_name]').innerText, name = '',
                        part = item.querySelector('[id^=feed_prod_id]').innerText, product = {};
                    link.getAttribute('href').split('?')[1].split(';').forEach(item => {
                        if (item.split('=')[0] === 'tmpl') {
                            product.tmpl = item.split('=')[1];
                        } else if (item.split('=')[0] === 'product_id') {
                            product.id = item.split('=')[1];
                        } else if (item.split('=')[0] === 'sessid') {
                            product.sessid = item.split('=')[1];
                        }
                    });
                    if (product.tmpl === 'product_details.html') {
                        link.setAttribute('href', `https://bo.icecat.biz/index.psgi?sessid=${product.sessid};tmpl=${product.tmpl};product_id=${product.id}`);
                    } else if (product.tmpl === 'product_new.html') {
                        link.setAttribute('href', `https://bo.icecat.biz/index.psgi?sessid=${product.sessid};tmpl=${product.tmpl};kh_brand=${brand};kh_part=${part};kh_name=${name}`);
                    }
                });
            } catch (err) {
                console.log(err);
            } finally {
                if (document.querySelector('.modified')) {
                    console.log('Links modified');
                } else {
                    console.log('Links not modified');
                    setTimeout(links, 1e3);
                }
            }
        };

        // Функция для изменения дизайна страницы списка пользователей
        const design = () => {
            document.querySelector('#page_content_wide').classList.add('userlist');
            let btn = document.querySelector('[name=new_search]');
            btn.setAttribute('value', 'Search');
            btn.removeAttribute('style');
            btn.classList.add('userlist-search');
            $('#search_form select').chosen();
            $('#search_form input').addClass('input-choosen');
        };

        links();
        design();
    };

    // Функция для работы с журналом
    // const journal = () => {
    //     const design = () => {
    //         document.querySelector('#page_content').setAttribute('id', 'page_content_wide');
    //         if (pageData.tmpl === 'editor_journal_edit') {
    //             document.querySelectorAll('table')[7].classList.add('product-table');
    //         } else {
    //             document.querySelectorAll('table')[6].classList.add('product-table');
    //         }
    //         document.querySelector('#page_content_wide').classList.add('editor-journal');
    //         document.querySelector('table.search').innerHTML = document.querySelector('table.search').innerHTML.replace(/&nbsp;/gm, '');
    //         document.querySelector('input[name="search_supplier_name"]').removeAttribute('style');
    //         let btn = document.querySelector('input[name=new_search]');
    //         btn.setAttribute('value', 'Search');
    //         btn.removeAttribute('style');
    //         btn.classList.add('ej-search');
    //         $('[name=search_changetype]').html($('[name=search_changetype]').html().replace(/(<!--option)/g, '<!--<option').replace(/(option-->)/g, 'option>-->').replace(/(<!--)|(-->)/g, ''));
    //         $('select').chosen();
    //         $('#search_catid_name,input[name="search_prodid"],input[name="search_supplier_name"]').addClass('input-choosen').css('padding', '5px 10px 4px');
    //         $('input[name="search_prodid"]').css('width', '130px');
    //     };
    // };

    // Функция для работы с новым продуктом
    const newProduct = () => {
        const addIDs = () => {
            try {
                const downshift = document.querySelectorAll('[id^="downshift-"][id*="-item-"]');
                downshift.forEach(element => {
                    const value = element.textContent.replace(/[^\w-]/g, '-').toLocaleLowerCase();
                    element.id = value;
                });
                const reactSelect = document.querySelectorAll('[id^="react-select-"]');
                reactSelect.forEach(element => {
                    const value = element.textContent.replace(/[^\w-]/g, '-').toLocaleLowerCase();;
                    element.id = value;
                });

                if(pageData.group==='editor'){
                    if (document.querySelectorAll('.react-select__dropdown-indicator').length===1 && !document.getElementById('family_btn')){
                        document.querySelectorAll('.react-select__dropdown-indicator')[0].id = 'family_btn';
                    } else {
                        if (document.querySelectorAll('.react-select__dropdown-indicator').length === 2 && !document.getElementById('series_btn')) {
                            document.querySelectorAll('.react-select__dropdown-indicator')[0].id = 'family_btn';
                            document.querySelectorAll('.react-select__dropdown-indicator')[1].id = 'series_btn';
                        }
                    }
                } else {
                    if(document.querySelectorAll('.react-select__dropdown-indicator').length>1) {
                        if (document.querySelectorAll('.react-select__dropdown-indicator').length===2 && !document.getElementById('family_btn')){
                            document.querySelectorAll('.react-select__dropdown-indicator')[0].id = 'family_btn';
                        }
                        if (document.querySelectorAll('.react-select__dropdown-indicator').length===3 && !document.getElementById('series_btn')){
                            document.querySelectorAll('.react-select__dropdown-indicator')[0].id = 'family_btn';
                            document.querySelectorAll('.react-select__dropdown-indicator')[1].id = 'series_btn';
                        }
                    }
                }
                document.querySelector('form').childNodes.forEach((item) => {
                    if (item.childNodes[0].matches('div')) {
                        let label = item.childNodes[0].querySelector('label').innerText.replace(/\s/g, '-').toLocaleLowerCase();
                        if (item.childNodes[1].querySelector('input')) {
                            item.childNodes[1].querySelector('input').setAttribute('id', label);
                        } else if (item.childNodes[1].querySelector('[type=button]')) {
                            item.childNodes[1].querySelector('[type=button]').setAttribute('id', label);
                        }
                    }
                });
                document.querySelector('form').setAttribute('name', 'NoFormName');
                document.querySelector('#is-dangerous').setAttribute('disabled', 'disabled');
            } catch (err) {
                console.log(err);
            } finally {
                if (!document.querySelector('#product-code')) {
                    setTimeout(addIDs, 1e3);
                }
            }
        };

        // Функция для добавления ID элементам списка
        const selectIDs = () => {
            document.querySelectorAll('li[id^=downshift]').forEach((item) => {
                item.setAttribute('id', item.innerText);
                item.style.color = 'green';
            });
        };

        // Наблюдатель за изменениями DOM
        const observer = () => {
            new MutationObserver((mutations) => {
                mutations.forEach((item) => {
                    if (item.type === 'childList' && item.addedNodes.length && document.querySelector('form') && document.querySelector('form').contains(item.target)) {
                        addIDs();
                    }
                    if ((item.target.matches('ul') || item.target.matches('body')) && item.addedNodes.length && item.addedNodes[0].id !== 'imacros-highlight-div') {
                        selectIDs();
                    }
                });
            }).observe(document.querySelector('body'), {childList: true, subtree: true, attributes: true});
        };

        addIDs();
        observer();
    };

    // Функция для работы с RTB (Rich Text Bullets)
    const rtb = () => {
        try {
            if (window.document.querySelector('[placeholder="Title"]') &&
                (!window.document.querySelector('[placeholder="Title"]').hasAttribute('id'))){
                window.document.querySelector('[placeholder="Title"]').id = 'title';
            }
            if (window.document.querySelector('[placeholder="Description"]') &&
                (!window.document.querySelector('[placeholder="Description"]').hasAttribute('id'))){
                window.document.querySelector('[placeholder="Description"]').id = 'description';
            }
            if (window.document.querySelector('[placeholder="Image URL"]') &&
                (!window.document.querySelector('[placeholder="Image URL"]').hasAttribute('id'))){
                window.document.querySelector('[placeholder="Image URL"]').id = 'imageURL';
            }
            if ((window.document.querySelectorAll('#rtb .react-select__dropdown-indicator')[1]) &&
                (!(window.document.querySelectorAll('#rtb .react-select__dropdown-indicator')[1].hasAttribute('id')))){
                window.document.querySelectorAll('#rtb .react-select__dropdown-indicator')[1].id = 'rtb_lang_select';
            }
        } catch (err) {
            console.log(err);
        } finally {
            if ((!window.document.querySelector('[placeholder="Title"]').hasAttribute('id')) ||
                (!window.document.querySelector('[placeholder="Description"]').hasAttribute('id')) ||
                (!window.document.querySelector('[placeholder="Image URL"]').hasAttribute('id')) ||
                (!(window.document.querySelectorAll('#rtb .react-select__dropdown-indicator')[1].hasAttribute('id')))) {
                setTimeout(rtb, 1e3);
            } else {
                console.log('IDs for RTB added');
            }
        }
    };
    // Функция корректировки product_search
    const searchPageCorrect = () => {
        const applyWidth = () => {
            document.querySelectorAll('svg.text-primary:not([width])').forEach(svg => svg.setAttribute('width', '25'));
        };

        // Проверяем, загружен ли DOM
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            applyWidth(); // Применяем изменения сразу
        } else {
            // Ждём загрузки DOM
            document.addEventListener('DOMContentLoaded', applyWidth);
        }

        // Наблюдатель для динамически добавляемых элементов
        const observer = new MutationObserver(applyWidth);
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    };

    // Наблюдатель для динамического изменения URL (При перехроде из продуктовой на Searh)
    function observeUrlChanges(callback) {
        const observer = new MutationObserver(() => {
            const currentUrl = window.location.href;

            if (currentUrl !== observer.lastUrl) {
                observer.lastUrl = currentUrl;
                console.log('🔄 URL изменился:', currentUrl);
                callback(currentUrl);
            }
        });

        observer.lastUrl = window.location.href;
        observer.observe(document.body, { childList: true, subtree: true });

        console.log('🔍 URL Observer запущен');
    }


    // Основная функция для запуска скрипта
    const start = async () => {
        console.log('Start')
        observeUrlChanges((newUrl) => {
            if(newUrl.includes('tmpl=product_search.html')){
                pageData.tmpl = 'product_search'
                searchPageCorrect();
            }
        });
        let navbar = document.querySelector('#top-nav-bar');
        navbar.insertAdjacentHTML('afterbegin', '<div id="top-status-bar"></div>');
        document.querySelector('#top-status-bar').innerHTML = `v${pageData.version}<a href="https://www.google.com/" target="_blank" title="Поблагодарить ruslan_m за отличный скрипт! Ну и про alex_alex не забывайте)" style="padding: 0 35px;"><i class="fas fa-donate"></i></a>`;
        css('https://alalexnik.github.io/icecat_css/style.css');
        css('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.0/css/all.min.css');
        css('https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css');
        await js('https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js');
        await getUser();
        toastr.options = {
            'closeButton': true,
            'positionClass': 'toast-bottom-right',
            'timeOut': 0,
            'extendedTimeOut': 0,
            'newestOnTop': true,
            'progressBar': true,
            'tapToDismiss': false
        };
        if (pageData.tmpl === 'product_details') {
            product(pageData.group);
        } else if (pageData.tmpl === 'product_search') {
            searchPageCorrect();
        } else if (pageData.tmpl === 'track_products') {
            userList();
        } else if (pageData.tmpl === 'product_new') {
            newProduct();
        } else if (pageData.tmpl === 'editor_journal_list' || pageData.tmpl === 'editor_journal_edit') {
            //journal();
        } else if (pageData.tmpl === 'product_bullets') {
            rtb();
        }
        if (pageData.group === 'superuser') {
            navbar.classList.add('superuser');
        } else if (pageData.group === 'supereditor') {
            navbar.classList.add('supereditor');
        }
        if (pageData.group === 'superuser' || pageData.group === 'supereditor') {
            pageData.mmos = await getMMO(pageData.productID);
            pageData.langs = await getLangs();
            addMultimediaColumn(pageData);
        }
    };
    await start();
})();

// Функция для получения списка языков
async function getLangs() {
    try {
        const response = await fetch(`https://bo.icecat.biz/restful/v2/language?access_key=${pageData.sessid}`);
        const json = await response.json();
        return json;
    } catch (error) {
        console.error(error);
    }
}

// Функция для получения MMO (Multimedia Objects)
async function getMMO(id) {
    try {
        const response = await fetch(`https://bo.icecat.biz/restful/v3/multimedia/${id}?accesskey=${pageData.sessid}`);
        const json = await response.json();
        return json;
    } catch (error) {
        console.error(error);
    }
}

// Функция для удаления MMO
async function removeMMO(id, uuid) {
    const mmo = window.pageData.mmos.find(mmo => mmo.Uuid === uuid);
    const lang = window.pageData.langs.find(lang => +lang.langid === +mmo.LangId);
    try {
        const response = await fetch(`https://bo.icecat.biz/restful/v3/multimedia/${id}?accesskey=${pageData.sessid}&Uuid=${uuid}`, {method: 'DELETE'});
        return `Multimedia object has been removed<br>Description: ${mmo.ShortDescr}<br>Lang: ${lang.code}`;
    } catch (error) {
        throw new Error(`Failed to remove multimedia object<br>Description: ${mmo.ShortDescr}<br>Lang: ${lang.code}`);
    }
}

// Функция для добавления колонки с мультимедиа
function addMultimediaColumn(pageData) {
    const rows = document.querySelectorAll('#productMMO tbody tr');
    if (rows.length !== pageData.mmos.length) {
        setTimeout(() => {
            addMultimediaColumn(pageData);
        }, 1000);
        return;
    }
    const head = document.querySelector('#productMMO thead tr');
    head.insertAdjacentHTML('beforeend', '<th class="table-header__column"><input type="checkbox" class="mmo-select-all"></th>');
    const exceptions = ['ProductStory', 'EU Energy Label', 'EU Product Fiche', 'ProductStory2.0'];
    rows.forEach((row, idx) => {
        const cols = [...row.querySelectorAll('td')].map(col => col.innerText);
        if (!exceptions.includes(cols[0])) {
            const lang = pageData.langs.find(l => l.code === cols[1]);
            const mmoData = pageData.mmos.find(m => {
                return m.ShortDescr === cols[0] && m.ContentType === cols[2] && +m.LangId === +lang.langid;
            });
            const td = document.createElement('td');
            td.innerHTML = `<input type="checkbox" class="mmo-select-row" data-uuid="${mmoData.Uuid}" data-idx="${idx}">`;
            row.insertAdjacentElement('beforeend', td);
        }
    });
    document.querySelector('.mmo-select-all').addEventListener('click', (event) => {
        const rows = document.querySelectorAll('.mmo-select-row');
        if (event.target.checked) {
            rows.forEach(node => {
                node.checked = true;
            });
        } else {
            rows.forEach(node => {
                node.checked = false;
            });
        }
    });
    const removeBtn = document.createElement('button');
    removeBtn.innerText = 'Remove';
    removeBtn.classList = 'kh-btn kh-btn-info';
    removeBtn.style.position = 'absolute';
    removeBtn.style.right = '132px';
    removeBtn.style.bottom = '0';
    removeBtn.style.padding = '8px 12px';
    removeBtn.style.borderColor = '#2b8694';
    removeBtn.style.border = '2px solid #2b8694';
    document.querySelector('#productMMO .add_mmo').insertAdjacentElement('afterend', removeBtn);
    removeBtn.addEventListener('click', () => {
        const selectedRows = [...document.querySelectorAll('.mmo-select-row')].filter(row => row.checked);
        selectedRows.forEach(row => {
            const uuid = row.getAttribute('data-uuid');
            const idx = row.getAttribute('data-idx');
            removeMMO(pageData.productID, uuid).then((data) => {
                rows[idx].remove();
                toastr.success(data, 'Success!', {
                    'positionClass': 'toast-top-right',
                    'timeOut': 5000,
                    'extendedTimeOut': 1000
                });
            }).catch((error) => {
                toastr.error(error.message, 'Error!');
                console.error(error);
            });
        });
    });
}