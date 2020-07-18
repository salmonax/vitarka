import { observable, computed, toJS, action } from 'mobx'

class MagicCollection {
  constructor (idProp = 'id', Child = MagicItem) {
    this.Child = Child
    this.idProp = idProp
    this.list = observable([])
    this.hash = observable.map({})
  }
  get length () { return this.list.length }
  get keys () { return this.hash.keys().slice() }
  _setProxy (proxy) { this.proxy = proxy }

  upsert (itemOrCollection, listCb) {
    if (!Array.isArray(itemOrCollection)) itemOrCollection = [itemOrCollection]
    const { idProp } = this
    for (let thing of itemOrCollection) {
      const id = thing[idProp]
      if (id) {
        const child = this.hash.get(id) || new this.Child(this, thing)
        this.hash.set(id, child)
        listCb(child)
      } else {
        console.warn('MagicStore - Ignored item on upsert: ', thing)
      }
    }
  }

  remove (itemOrCollection, listCb) {
    if (!Array.isArray(itemOrCollection)) itemOrCollection = [itemOrCollection]
    const { idProp } = this
    for (let thing of itemOrCollection) {
      const id = thing[idProp]
      if (id && this.hash.has(id)) {
        this.hash.delete(key)
        listCb()
      } else {
        console.warn('MagicStore - Ignored item on remove: ', thing)
      }
    }
  }
}
class MagicItem {
  id = null;
  parent = null;
  @observable data = {};

  constructor (store, data) {
    this.id = data.id
    this.data = data
    this.parent = store.proxy
  }
  hydrate (json) {

  }
  @computed get asJSON () {
    return toJS(this.data)
  }
  @action updateFromJSON (data) {
    Object.assign(this.data, data)
  }
}

const magicCollection = new MagicCollection()
const magicStore = new Proxy(magicCollection, {
  get: (target, key) => {
    if (key in target) return target[key]
    if (Array.prototype.hasOwnProperty(key)) {
      if (typeof Array.prototype[key] === 'function') {
        if (!['shift', 'pop', 'unshift', 'push'].includes(key)) return target.list[key].bind(target.list)
        return function (...args) {
          const method = ['shift', 'pop'].includes(key) ? 'remove' : 'upsert'
          target[method](args, (item) => target.list[key](item))
        }
      }
      return target.list[key]
    }
    if (!isNaN(+key)) return target.list[key]
    if (typeof key === 'string') return target.hash.get(key)
  }
})
magicCollection._setProxy(magicStore)
export default magicStore
