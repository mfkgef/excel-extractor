document.addEventListener('DOMContentLoaded', () => {
    // Material Design组件初始化
    const dialogs = document.querySelectorAll('.mdc-dialog');
    const saveTemplateDialog = new mdc.dialog.MDCDialog(document.getElementById('save-template-dialog'));
    const editTemplateDialog = new mdc.dialog.MDCDialog(document.getElementById('edit-template-dialog'));
    const templateNameField = new mdc.textField.MDCTextField(document.getElementById('template-name-field'));

    // DOM元素
    const fileInput = document.getElementById('excel-file');
    const fileSelectButton = document.querySelector('.file-select-button');
    const fileName = document.querySelector('.file-name');
    const dataContainer = document.getElementById('data-container');
    const columnsContainer = document.getElementById('columns-container');
    const tableHeader = document.getElementById('table-header');
    const tableBody = document.getElementById('table-body');
    const tableContainer = document.querySelector('.table-container');
    const exportButton = document.getElementById('export-btn');
    const templateSelect = document.getElementById('template-select');
    const saveTemplateBtn = document.getElementById('save-template-btn');
    const deleteTemplateBtn = document.getElementById('delete-template-btn');
    const editTemplateBtn = document.getElementById('edit-template-btn');
    const addTemplateColumnBtn = document.getElementById('add-template-column-btn');
    const templateColumns = document.getElementById('template-columns');
    const selectAllBtn = document.getElementById('select-all-btn');
    const deselectAllBtn = document.getElementById('deselect-all-btn');
    
    // 步骤指示器元素
    const stepUpload = document.getElementById('step-upload');
    const stepSelect = document.getElementById('step-select');
    const stepExport = document.getElementById('step-export');

    // 数据变量
    let excelData = [];
    let headers = [];
    let selectedColumns = {};
    let currentTemplate = null;
    const templateManager = new TemplateManager();

    // 文件选择按钮点击事件
    fileSelectButton.addEventListener('click', () => {
        fileInput.click();
    });

    // 文件选择事件处理
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            fileName.textContent = file.name;
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                excelData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                if (excelData.length > 0) {
                    headers = excelData[0];
                    renderColumnSelection();
                    renderTable();
                    dataContainer.classList.remove('hidden');
                    exportButton.disabled = false;
                    
                    // 更新步骤指示器
                    stepUpload.classList.add('completed');
                    stepSelect.classList.add('active');
                }
            };
            
            reader.readAsArrayBuffer(file);
        }
    });

    // 添加模板选择事件监听器
    templateSelect.addEventListener('change', () => {
        const templateName = templateSelect.value;
        if (templateName) {
            loadTemplate();
        }
    });

    // 拖拽排序相关变量
    let draggedItem = null;
    let draggedItemIndex = null;

    // 初始化拖拽排序
    function initializeDragAndDrop() {
        const templateColumns = document.getElementById('template-columns');
        
        templateColumns.addEventListener('dragstart', (e) => {
            const item = e.target.closest('.template-column-item');
            if (!item) return;
            
            draggedItem = item;
            draggedItemIndex = Array.from(templateColumns.children).indexOf(item);
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        templateColumns.addEventListener('dragend', (e) => {
            const item = e.target.closest('.template-column-item');
            if (!item) return;
            
            item.classList.remove('dragging');
            draggedItem = null;
            draggedItemIndex = null;
        });

        templateColumns.addEventListener('dragover', (e) => {
            e.preventDefault();
            const item = e.target.closest('.template-column-item');
            if (!item || item === draggedItem) return;

            const currentIndex = Array.from(templateColumns.children).indexOf(item);
            if (currentIndex > draggedItemIndex) {
                item.after(draggedItem);
            } else {
                item.before(draggedItem);
            }
            draggedItemIndex = Array.from(templateColumns.children).indexOf(draggedItem);
        });
    }

    // 渲染列选择界面
    function renderColumnSelection() {
        columnsContainer.innerHTML = '';
        headers.forEach((header, index) => {
            const columnDiv = document.createElement('div');
            columnDiv.className = 'column-item';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `col-${index}`;
            checkbox.className = 'column-checkbox';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = header;
            input.className = 'column-name-input';
            input.disabled = true;
            
            checkbox.addEventListener('change', () => {
                input.disabled = !checkbox.checked;
                if (checkbox.checked) {
                    selectedColumns[index] = input.value;
                } else {
                    delete selectedColumns[index];
                }
                updateExportButtonState();
            });
            
            input.addEventListener('input', () => {
                if (checkbox.checked) {
                    selectedColumns[index] = input.value;
                }
            });
            
            columnDiv.appendChild(checkbox);
            columnDiv.appendChild(input);
            columnsContainer.appendChild(columnDiv);
        });
    }

    // 渲染数据表格 - 显示完整数据
    function renderTable() {
        // 清空表格
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '';
        
        // 渲染表头 - 显示所有列
        headers.forEach(header => {
            const th = document.createElement('th');
            th.className = 'mdc-data-table__header-cell';
            th.textContent = header;
            tableHeader.appendChild(th);
        });
        
        // 渲染数据行 - 显示所有行和所有列
        excelData.slice(1).forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'mdc-data-table__row';
            
            // 确保所有单元格都显示，包括可能为undefined的数据
            headers.forEach((_, index) => {
                const td = document.createElement('td');
                td.className = 'mdc-data-table__cell';
                
                // 处理单元格值，确保不同类型的数据都能正确显示
                let cellValue = row[index];
                
                // 转换各种数据类型为适合显示的字符串
                if (cellValue === undefined || cellValue === null) {
                    cellValue = '';
                } else if (typeof cellValue === 'object') {
                    // 对于日期类型或复杂对象，尝试合理展示
                    if (cellValue instanceof Date) {
                        cellValue = cellValue.toLocaleString();
                    } else {
                        try {
                            cellValue = JSON.stringify(cellValue);
                        } catch (e) {
                            cellValue = '[复杂对象]';
                        }
                    }
                }
                
                td.textContent = cellValue;
                tr.appendChild(td);
            });
            
            tableBody.appendChild(tr);
        });

        // 添加滚动提示
        addScrollHints();
        
        // 显示数据计数信息
        showDataCountInfo();
    }

    // 显示数据计数信息
    function showDataCountInfo() {
        // 查找或创建信息元素
        let infoElement = document.getElementById('data-count-info');
        if (!infoElement) {
            infoElement = document.createElement('div');
            infoElement.id = 'data-count-info';
            infoElement.className = 'data-count-info';
            
            const previewHeader = document.querySelector('.preview-card .card-header');
            if (previewHeader) {
                const title = previewHeader.querySelector('h2');
                if (title) {
                    title.textContent = '数据预览';
                }
            }
            
            tableContainer.parentNode.insertBefore(infoElement, tableContainer);
        }
        
        // 设置信息内容
        infoElement.textContent = `共 ${headers.length} 列，${excelData.length - 1} 行数据`;
    }

    // 添加滚动提示
    function addScrollHints() {
        // 移除现有提示
        const existingHints = document.querySelectorAll('.scroll-hint');
        existingHints.forEach(hint => hint.remove());

        // 检查表格是否需要滚动
        setTimeout(() => {
            const tableWidth = document.getElementById('excel-table').offsetWidth;
            const containerWidth = tableContainer.offsetWidth;
            const containerHeight = tableContainer.offsetHeight;
            const tableHeight = tableContainer.scrollHeight;

            // 如果表格宽度超过容器，添加水平滚动提示
            if (tableWidth > containerWidth) {
                const rightHint = document.createElement('div');
                rightHint.className = 'scroll-hint right';
                rightHint.innerHTML = '<span class="material-icons">chevron_right</span>';
                tableContainer.appendChild(rightHint);
            }

            // 如果表格高度超过容器，添加垂直滚动提示
            if (tableHeight > containerHeight) {
                const bottomHint = document.createElement('div');
                bottomHint.className = 'scroll-hint bottom';
                bottomHint.innerHTML = '<span class="material-icons">expand_more</span>';
                tableContainer.appendChild(bottomHint);
            }

            // 监听滚动事件，隐藏提示
            tableContainer.addEventListener('scroll', () => {
                const hints = document.querySelectorAll('.scroll-hint');
                hints.forEach(hint => hint.style.opacity = '0');
                setTimeout(() => {
                    hints.forEach(hint => hint.remove());
                }, 300);
            }, { once: true });
        }, 500);
    }

    // 初始化模板选择下拉框
    function initializeTemplateSelect() {
        const templateNames = templateManager.getTemplateNames();
        templateSelect.innerHTML = '<option value="" disabled selected>选择模板</option>';
        templateNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            templateSelect.appendChild(option);
        });
    }

    // 加载模板
    function loadTemplate() {
        const templateName = templateSelect.value;
        if (!templateName) return;
        
        const template = templateManager.getTemplate(templateName);
        if (!template) return;
        
        // 重置所有选择
        document.querySelectorAll('.column-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.nextElementSibling.disabled = true;
        });
        
        selectedColumns = {};
        
        // 应用模板
        Object.entries(template.columns).forEach(([, column]) => {
            const originalName = column.originalName;
            const newName = column.newName;
            
            // 查找匹配的列
            headers.forEach((header, idx) => {
                if (header === originalName) {
                    const checkbox = document.getElementById(`col-${idx}`);
                    if (checkbox) {
                        checkbox.checked = true;
                        const input = checkbox.nextElementSibling;
                        input.disabled = false;
                        input.value = newName;
                        selectedColumns[idx] = newName;
                    }
                }
            });
        });
        
        updateExportButtonState();
        showToast(`已加载模板: ${templateName}`);
    }

    // 添加模板列项
    function addTemplateColumnItem(originalName = '', newName = '') {
        const columnItem = document.createElement('div');
        columnItem.className = 'template-column-item';
        columnItem.draggable = true;
        
        const originalInput = document.createElement('input');
        originalInput.type = 'text';
        originalInput.className = 'original-name-input';
        originalInput.placeholder = '原始列名';
        originalInput.value = originalName;
        
        const newNameInput = document.createElement('input');
        newNameInput.type = 'text';
        newNameInput.className = 'new-name-input';
        newNameInput.placeholder = '新列名';
        newNameInput.value = newName;
        
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'material-icons';
        deleteBtn.textContent = 'delete';
        deleteBtn.addEventListener('click', () => {
            columnItem.remove();
        });
        
        columnItem.appendChild(originalInput);
        columnItem.appendChild(newNameInput);
        columnItem.appendChild(deleteBtn);
        
        templateColumns.appendChild(columnItem);
    }

    // 打开编辑模板对话框
    function openEditTemplateDialog(templateName) {
        const template = templateManager.getTemplate(templateName);
        if (!template) return;
        
        currentTemplate = templateName;
        templateColumns.innerHTML = '';
        
        // 按照顺序添加现有列
        const sortedColumns = Object.entries(template.columns)
            .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0));
            
        sortedColumns.forEach(([, column]) => {
            addTemplateColumnItem(column.originalName, column.newName);
        });
        
        // 初始化拖拽排序
        initializeDragAndDrop();
        
        editTemplateDialog.open();
    }

    // 保存编辑后的模板
    function saveEditedTemplate() {
        if (!currentTemplate) return;
        
        const columns = {};
        const columnItems = templateColumns.querySelectorAll('.template-column-item');
        
        columnItems.forEach((item, index) => {
            const originalName = item.querySelector('.original-name-input').value.trim();
            const newName = item.querySelector('.new-name-input').value.trim();
            
            if (originalName && newName) {
                columns[index] = {
                    originalName: originalName,
                    newName: newName,
                    order: index
                };
            }
        });
        
        templateManager.updateTemplate(currentTemplate, columns);
        editTemplateDialog.close();
        
        // 如果当前模板是选中状态，重新加载它
        if (templateSelect.value === currentTemplate) {
            loadTemplate();
        }
        
        // 刷新模板列表
        initializeTemplateSelect();
        templateSelect.value = currentTemplate;
        
        showToast(`已更新模板: ${currentTemplate}`);
    }

    // 导出选中的数据
    function exportSelectedData() {
        // 更新步骤指示器
        stepSelect.classList.add('completed');
        stepExport.classList.add('active');
        
        // 获取当前选中的模板
        const templateName = templateSelect.value;
        let templateColumns = {};
        
        if (templateName) {
            // 如果有选择模板，使用模板中的列配置
            const template = templateManager.getTemplate(templateName);
            if (template) {
                templateColumns = template.columns;
            }
        }
        
        // 合并模板列和选中列
        const exportColumns = { ...templateColumns };
        Object.entries(selectedColumns).forEach(([index, newName]) => {
            if (!Object.values(exportColumns).some(col => col.newName === newName)) {
                exportColumns[index] = {
                    originalName: headers[index],
                    newName: newName,
                    order: Object.keys(exportColumns).length
                };
            }
        });

        if (Object.keys(exportColumns).length === 0) {
            alert('请至少选择一列数据或使用模板');
            return;
        }
        
        // 按照order排序列
        const sortedColumns = Object.entries(exportColumns)
            .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
            .map(([,column]) => column);
        
        // 创建要导出的数据数组
        const exportData = [];
        
        // 添加表头行（使用所有列的新名称）
        const headerRow = sortedColumns.map(col => col.newName);
        exportData.push(headerRow);
        
        // 创建列名到索引的映射
        const headerMap = {};
        headers.forEach((header, index) => {
            headerMap[header] = index;
        });
        
        // 添加数据行
        excelData.slice(1).forEach(row => {
            const newRow = sortedColumns.map(col => {
                const index = headerMap[col.originalName];
                return index !== undefined && row[index] !== undefined ? row[index] : '';
            });
            exportData.push(newRow);
        });
        
        // 创建工作簿
        const ws = XLSX.utils.aoa_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'ExportedData');
        
        // 生成文件名
        const fileExtension = fileName.textContent.split('.').pop();
        const baseFileName = fileName.textContent.replace(`.${fileExtension}`, '');
        const exportFileName = templateName ? 
            `${baseFileName}_${templateName}.xlsx` : 
            `${baseFileName}_export.xlsx`;
        
        // 导出为Excel文件
        XLSX.writeFile(wb, exportFileName);
        
        showToast(`已导出到: ${exportFileName}`);
    }
    
    // 更新导出按钮状态
    function updateExportButtonState() {
        const hasSelectedColumns = Object.keys(selectedColumns).length > 0;
        exportButton.disabled = !hasSelectedColumns;
        
        if (hasSelectedColumns) {
            stepSelect.classList.add('completed');
            stepExport.classList.add('active');
        } else {
            stepSelect.classList.remove('completed');
            stepExport.classList.remove('active');
        }
    }
    
    // 显示消息提示
    function showToast(message) {
        // 检查是否已有提示框
        let toast = document.querySelector('.toast');
        if (toast) {
            toast.remove();
        }
        
        // 创建提示框
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 3秒后隐藏
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // 全选/取消全选事件
    selectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.column-checkbox').forEach(checkbox => {
            checkbox.checked = true;
            const input = checkbox.nextElementSibling;
            input.disabled = false;
            selectedColumns[checkbox.id.replace('col-', '')] = input.value;
        });
        updateExportButtonState();
    });
    
    deselectAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.column-checkbox').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.nextElementSibling.disabled = true;
        });
        selectedColumns = {};
        updateExportButtonState();
    });

    // 事件监听器
    saveTemplateBtn.addEventListener('click', () => {
        // 检查是否有选择的列
        if (Object.keys(selectedColumns).length === 0) {
            alert('请至少选择一列数据来创建模板');
            return;
        }
        
        templateNameField.value = '';
        saveTemplateDialog.open();
    });
    
    deleteTemplateBtn.addEventListener('click', () => {
        const templateName = templateSelect.value;
        if (templateName && confirm(`确定要删除模板"${templateName}"吗？`)) {
            templateManager.deleteTemplate(templateName);
            initializeTemplateSelect();
            showToast(`已删除模板: ${templateName}`);
        }
    });
    
    editTemplateBtn.addEventListener('click', () => {
        const templateName = templateSelect.value;
        if (templateName) {
            openEditTemplateDialog(templateName);
        } else {
            alert('请先选择一个模板');
        }
    });
    
    addTemplateColumnBtn.addEventListener('click', () => {
        addTemplateColumnItem();
    });
    
    saveTemplateDialog.listen('MDCDialog:closed', (event) => {
        if (event.detail.action === 'accept') {
            const templateName = templateNameField.value.trim();
            if (templateName) {
                const columns = {};
                Object.entries(selectedColumns).forEach(([index, newName]) => {
                    columns[index] = {
                        originalName: headers[index],
                        newName: newName,
                        order: parseInt(index)
                    };
                });
                templateManager.addTemplate(templateName, columns);
                initializeTemplateSelect();
                templateSelect.value = templateName;
                showToast(`已保存新模板: ${templateName}`);
            } else {
                alert('请输入模板名称');
            }
        }
    });
    
    editTemplateDialog.listen('MDCDialog:closed', (event) => {
        if (event.detail.action === 'accept') {
            saveEditedTemplate();
        }
    });
    
    exportButton.addEventListener('click', exportSelectedData);

    // 监听窗口大小变化，更新滚动提示
    window.addEventListener('resize', () => {
        if (excelData.length > 0) {
            addScrollHints();
        }
    });

    // 初始化
    initializeTemplateSelect();
});