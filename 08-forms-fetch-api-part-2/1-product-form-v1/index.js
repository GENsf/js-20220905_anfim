import escapeHtml from './utils/escape-html.js';
import fetchJson from './utils/fetch-json.js';

const IMGUR_CLIENT_ID = '28aaa2e823b03b1';
const BACKEND_URL = 'https://course-js.javascript.ru';

export default class ProductForm {
  element;
  subElements = {};
  formDefault = {
    title: '',
    description: '',
    quantity: 1,
    subcategory: '',
    status: 1,
    images: [],
    price: 100,
    discount: 0,
  };

  constructor (productId = '') {
    this.productId = productId;
  }

  
  async render () {
    const fetchCategories = this.fetchCategories();
    const fetchProduct = this.productId ? this.fetchProduct(this.productId) : Promise.resolve([this.formDefault]);
    const [categotiesData, productResponse] = await Promise.all([fetchCategories, fetchProduct])
    const [productData] = productResponse
    
    this.imgArr = []
    this.product = productData
    this.categories = categotiesData
    
    this.renderForm()
  }
  
  fetchProduct() {
    return fetchJson(`${BACKEND_URL}/api/rest/products?id=${this.productId}`)
  }
  fetchCategories() {
    return fetchJson(`${BACKEND_URL}/api/rest/categories?_sort=weight&_refs=subcategory`)
  }

  renderForm() {
    const element = document.createElement("div");
    element.innerHTML = this.template;
    this.element = element.firstElementChild;

    this.subElements = this.getSubElements()

    this.setData()
    this.initEventListeners()
  }

  setData() {
    const exclusions = []
    for (const item in this.subElements) {
      if (this.subElements[item] === null) continue
      if (exclusions.indexOf(this.subElements[item].name) !== -1) continue
      this.subElements[item].value = this.product[item]
    }
    this.imgArr = [...this.product.images]
  }

  initEventListeners() {
    this.subElements.uploadImage.addEventListener('click', this.uploadImages)
    this.subElements.form.addEventListener('submit', this.formSubmit)
    this.subElements.imageList.addEventListener('click', this.deleteImg)
  }

  uploadImages = () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.click()

    fileInput.addEventListener('change', () => {
      fetch('https://api.imgur.com/3/image', {
        method: "POST", 
        headers: {
          Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
        },
        body: fileInput.files[0] 
      })
      .then(response => {
        const data = response.json()
        data.then(data => {
          if (data.status >= 400) {
            console.error(data.data.error)
            return
          }
          const newImage = {
            url: data.data.link,
            source: fileInput.files[0].name,
          }
          this.imgArr.push(newImage)
          this.appendNewImage(newImage)
        })
      })
      .catch(error => {
        console.error(error)
      })
    })
  }

  appendNewImage (item) {
    let template = document.createElement('div')
    template.innerHTML = `
      <li class="products-edit__imagelist-item sortable-list__item" style="">
        <input type="hidden" name="url" value="${item.url}">
        <input type="hidden" name="source" value="${item.source}">
        <span>
          <img src="icon-grab.svg" data-grab-handle="" alt="grab">
          <img class="sortable-table__cell-img" alt="Image" src="${item.url}">
          <span>${item.source}</span>
        </span>
        <button type="button">
          <img src="icon-trash.svg" data-delete-handle="" alt="delete">
        </button>
      </li>
    `
    template = template.firstElementChild
    this.subElements.imageList.firstElementChild.append(template)
  }

  deleteImg = event => {
    if (event.target.closest('[type="button"]') === null) return
    const target = event.target.closest('[type="button"]')
    const parent = target.parentNode
    const source = parent.querySelector('[name="source"]').value
    const index = this.product.images.findIndex(image => image.source === source)
    this.product.images.splice(index, 1)
    parent.remove()
  }

  formSubmit = event => {
    event.preventDefault()
    const formData = {}
    for (const item in this.formDefault) {
      if (this.subElements[item] === null) continue
      if (this.subElements[item].type === 'number' || this.subElements[item].name === 'status') {
        formData[item] = parseFloat(this.subElements[item].value)
      } else {
        formData[item] = this.subElements[item].value
      }
    }
    formData.images = [...this.imgArr]
    
    this.sendData(formData)
  }

  async sendData(formData) {
    try {
      const method = this.productId ? 'PATCH' : 'PUT'
      const response = await fetchJson(`${BACKEND_URL}/api/rest/products`, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      this.dispatchEvent(response.id)
    } catch (error) {
      console.error(error)
    }
  }

  dispatchEvent (id) {
    const event = this.productId ? 
    new CustomEvent('product-updated', {detail: id}) :
    new CustomEvent('product-saved')

    this.element.dispatchEvent(event)
  }
  
  getSubElements () {
    const form = this.element.querySelector('[data-element="productForm"]')
    const subElements = {}
    subElements.form = form
    subElements.imageList = form.querySelector(`[data-element="imageListContainer"]`)
    subElements.uploadImage = form.querySelector(`[name="uploadImage"]`)
    subElements.submitBtn = form.querySelector(`[name="save"]`)
    for (const item in this.formDefault) {
      subElements[item] = form.querySelector(`[name="${item}"]`)
    }
    return subElements
  }

  imagesTemplate() {
    const imagesTemp = []
    this.product.images.map(item => 
        imagesTemp.push(`
          <li class="products-edit__imagelist-item sortable-list__item" style="">
            <input type="hidden" name="url" value="${item.url}">
            <input type="hidden" name="source" value="${item.source}">
            <span>
              <img src="icon-grab.svg" data-grab-handle="" alt="grab">
              <img class="sortable-table__cell-img" alt="Image" src="${item.url}">
              <span>${item.source}</span>
            </span>
            <button type="button">
              <img src="icon-trash.svg" data-delete-handle="" alt="delete">
            </button>
          </li>
        `)
    )
    return imagesTemp.join('')
  }

  categoryTemplate() {
    const categoryTemp = []
    this.categories.map(item => 
      item.subcategories.map(subItem => {
        categoryTemp.push(`<option value="${subItem.id}">${item.title} &gt; ${subItem.title}</option>`)
      })
    )
    return categoryTemp.join('')
  }

  get template() {
    return `
      <div class="product-form">
        <form data-element="productForm" class="form-grid">
          <div class="form-group form-100group__half_left">
            <fieldset>
              <label class="form-label">Название товара</label>
              <input 
                required="" 
                type="text" 
                name="title" 
                class="form-control" 
                placeholder="Название товара"
              >
            </fieldset>
          </div>
          <div class="form-group form-group__wide">
            <label class="form-label">Описание</label>
            <textarea 
              required="" 
              class="form-control" 
              name="description" 
              data-element="productDescription" 
              placeholder="Описание товара"
            ></textarea>
          </div>
          <div class="form-group form-group__wide" data-element="sortable-list-container">
            <label class="form-label">Фото</label>
            <div data-element="imageListContainer">
              <ul class="sortable-list">
                ${this.imagesTemplate()}
              </ul>
            </div>
            <button type="button" name="uploadImage" class="button-primary-outline"><span>Загрузить</span></button>
          </div>
          <div class="form-group form-group__half_left">
            <label class="form-label">Категория</label>
            <select class="form-control" name="subcategory">
              ${this.categoryTemplate()}
            </select>
          </div>
          <div class="form-group form-group__half_left form-group__two-col">
            <fieldset>
              <label class="form-label">Цена ($)</label>
              <input 
                required="" 
                type="number" 
                name="price" 
                class="form-control" 
                placeholder="100"
              >
            </fieldset>
            <fieldset>
              <label class="form-label">Скидка ($)</label>
              <input 
                required="" 
                type="number" 
                name="discount" 
                class="form-control" 
                placeholder="0"
              >
            </fieldset>
          </div>
          <div class="form-group form-group__part-half">
            <label class="form-label">Количество</label>
            <input 
              required="" 
              type="number" 
              class="form-control" 
              name="quantity" 
              placeholder="1"
            >
          </div>
          <div class="form-group form-group__part-half">
            <label class="form-label">Статус</label>
            <select class="form-control" name="status">
              <option value="1">Активен</option>
              <option value="0">Неактивен</option>
            </select>
          </div>
          <div class="form-buttons">
            <button type="submit" name="save" class="button-primary-outline">
              Сохранить товар
            </button>
          </div>
        </form>
      </div>
    `;
  }

  remove () {
    this.element?.remove()
  }

  destroy () {
    this.remove()
    this.element = null
  }
}
