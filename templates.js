class TemplateManager {
    constructor() {
        this.templates = this.loadTemplates();
    }

    // 加载所有模板
    loadTemplates() {
        const templates = localStorage.getItem('excel_export_templates');
        return templates ? JSON.parse(templates) : {};
    }

    // 保存所有模板
    saveTemplates() {
        localStorage.setItem('excel_export_templates', JSON.stringify(this.templates));
    }

    // 添加新模板
    addTemplate(name, columns) {
        this.templates[name] = {
            columns: columns,
            createdAt: new Date().toISOString()
        };
        this.saveTemplates();
    }

    // 更新模板
    updateTemplate(name, columns) {
        if (this.templates[name]) {
            this.templates[name].columns = columns;
            this.templates[name].updatedAt = new Date().toISOString();
            this.saveTemplates();
            return true;
        }
        return false;
    }

    // 获取模板
    getTemplate(name) {
        return this.templates[name];
    }

    // 删除模板
    deleteTemplate(name) {
        delete this.templates[name];
        this.saveTemplates();
    }

    // 获取所有模板名称
    getTemplateNames() {
        return Object.keys(this.templates);
    }
}

// 导出模板管理器实例
const templateManager = new TemplateManager();