<template>
  <div :class="autocompleteCls">
    <div :class="showCls">
      <template v-if="multiple"><span v-for="obj of objects"
              :key="obj.key"><span>{{obj.title}}</span><i class="h-icon-close"
           @click.stop="remove(obj)"
           v-if="!disabled"></i></span>
        <input :disabled="disabled"
               type="text"
               class="h-autocomplete-input"
               @focus="focus"
               :value="showValue"
               @blur="blur"
               @keyup="handle"
               @keypress.enter="enterHandle"
               :placeholder="showPlaceholder" />
        <i class="h-icon-loading"
           v-if="loading"></i>
      </template>
      <template v-if="!multiple">
        <input type="text"
               :disabled="disabled"
               class="h-autocomplete-input"
               @focus="focus"
               :value="showValue"
               @blur="blur"
               @keyup="handle"
               @keypress.enter="enterHandle"
               :placeholder="showPlaceholder" />
        <i class="h-icon-loading"
           v-if="loading"></i>
        <i class="h-icon-close text-hover" v-else-if="showValue&&!disabled" @click="clear"></i>
      </template>
    </div>
  
    <!--:class="{'h-autocomplete-item-selected': result==nowSelected}"-->
    <div :class="groupCls">
      <ul class="h-autocomplete-ul" v-if="isShow">
        <slot name="top" :results="results"></slot>
        <li v-for="(result, index) of results"
            :key="result.key"
            class="h-autocomplete-item"
            :class="{'h-autocomplete-item-selected': index == nowSelected}"
            @click="picker(result)">
          <div v-if="!!result.html"
               v-html="result.html"></div>
          <template v-else-if="!$scopedSlots.item">{{result.title}}</template>
          <slot v-else :item="result" name="item"></slot>
        </li>
        <li v-if="results.length==0"
            v-color:gray
            class="text-center">{{showEmptyContent}}</li>
        <slot name="bottom" :results="results"></slot>
      </ul>
    </div>
  </div>
</template>
<script>
import config from '../../utils/config';
import utils from '../../utils/utils';
import Dropdown from '../../plugins/dropdown';
import Locale from '../../mixins/locale';

const prefix = 'h-autocomplete';

export default {
  name: 'hAutoComplete',
  mixins: [ Locale ],
  props: {
    multiple: {
      type: Boolean,
      default: false
    },
    mustMatch: {
      type: Boolean,
      default: true
    },
    type: {
      type: [String],
      default: 'key'  //object, title
    },
    disabled: {
      type: Boolean,
      default: false
    },
    datas: [Array, Object],
    dict: String,
    placeholder: {
      type: String,
      // default: "请输入"
    },
    value: [Number, String, Array, Object],
    option: Object,
    show: String,
    emptyContent: {
      type: [String, Object],
      // default: "未搜索到相关数据"
    },
    config: String,
    className: String,
    delay: {
      type: Number,
      default: 100
    }
  },
  data() {
    return {
      html: "autocomplete_rander_html",
      focusing: false,
      objects: [],
      object: { key: null, title: this.show, value: null },
      nowSelected: -1,
      tempValue: null,
      searchValue: null,
      oldValue: this.value,
      focusValue: null,
      loading: false,
      content: null,
      loadDatas: [],
      isShow: false,
      searchTimeout: null
    };
  },
  watch: {
    value() {
      if (this.oldValue == this.value) {
        return;
      }
      this.parse();
    },
    disabled() {
      if (this.disabled) {
        this.dropdown.disabled();
      } else {
        this.dropdown.enabled();
      }
    },
    nowSelected() {
      this.$nextTick(() => {
        if (this.content && this.nowSelected > -1) {
          let dom = this.content.querySelector('.h-autocomplete-item-selected');
          let uldom = this.content.querySelector('.h-autocomplete-ul');
          if (dom && uldom) {
            if ((dom.offsetTop + dom.offsetHeight) - this.content.scrollTop > this.content.offsetHeight) {
              this.content.scrollTop = (dom.offsetTop + dom.offsetHeight) - this.content.offsetHeight;
            } else if (dom.offsetTop - this.content.scrollTop < 0) {
              this.content.scrollTop = dom.offsetTop;
            }
          }
        }
      })
    }
  },
  beforeMount() {
    this.parse();
  },
  mounted() {
    this.$nextTick(() => {
      let el = this.$el.querySelector('.h-autocomplete-show');
      this.content = this.$el.querySelector('.h-autocomplete-group');
      let that = this;
      this.dropdown = new Dropdown(el, {
        trigger: '',
        triggerOnce: true,
        content: this.content,
        disabled: this.disabled,
        equalWidth: true,
        events: {
          show(){
            that.isShow = true;
          }
        }
      });
    });
  },
  methods: {
    parse() {
      if (this.multiple) {
        let os = [];
        if (utils.isArray(this.value) && this.value.length > 0) {
          for (let v of this.value) {
            os.push(this.getValue(v));
          }
        }
        this.objects = os;
      } else {
        let value = null;
        if (this.type == 'key') {
          if(!utils.isNull(this.value)){
            value = {
              [this.param.keyName]: this.value,
              [this.param.titleName]: this.show,
            }
          }
        } else if (this.type == 'title') {
          if(!utils.isNull(this.value)){
            value = {
              [this.param.keyName]: this.value,
              [this.param.titleName]: this.value,
            }
          }
        } else {
          value = this.value;
        }
        if (utils.isNull(value)) {
          this.object = { key: null, title: null, value: null };
        } else {
          utils.extend(this.object, this.getValue(value));
        }
      }
      this.oldValue = this.value;
    },
    dispose() {
      let value = null;
      let inputValue = null;
      if (!this.mustMatch) {
        if (this.type == 'key' || this.type == 'title') {
          inputValue = this.showValue;
        } else if (!utils.isBlank(this.showValue)) {
          inputValue = { [this.param.titleName]: this.showValue };
        } else {
          inputValue = null;
        }
      } else {
        this.tempValue = null;
      }
      if (this.multiple) {
        value = [];
        if (!utils.isNull(this.showValue)) {
          if (this.type == 'key' || this.type == 'title') {
            this.objects.push(inputValue);
          } else {
            this.objects.push(this.getValue(inputValue));
          }
        }
        if (utils.isArray(this.objects) && this.objects.length > 0) {
          for (let o of this.objects) {
            value.push(this.getV(o));
          }
        }
      } else {
        value = this.getV(this.object);
        if (utils.isNull(value) && !utils.isNull(inputValue)) {
          value = inputValue;
        }
      }
      return value;
    },
    getV(object) {
      if (this.type == 'key') {
        return object.key;
      } else if (this.type == 'title') {
        return object.title;
      } else {
        return object.value;
      }
    },
    getValue(item) {
      if (utils.isFunction(this.param.getValue)) {
        return this.param.getValue.call(this.param, item);
      } else {
        return utils.getValue(item, this.param);
      }
    },
    focus(event) {
      this.focusing = true;
      this.focusValue = event.target.value;
      if (this.multiple) this.searchValue = null;
      this.search(event.target);
    },
    blur(event) {
      this.focusing = false;
      setTimeout(() => {
        let nowValue = event.target.value;
        let focusValue = this.focusValue;
        if (focusValue === null) focusValue = '';
        if (focusValue !== nowValue) {
          if (this.mustMatch) {
            this.tempValue = null;
            if (this.focusValue != '' && this.object.key == null && !this.multiple) {
              this.setvalue('blur');
            }
          } else {
            this.setvalue('blur');
          }
        }
      }, 100);
    },
    handle(event) {
      let code = event.keyCode||event.which||event.charCode;
      if (code == 38) {
        if (this.nowSelected > 0) {
          this.nowSelected -= 1;
        }
      } else if (code == 40) {
        if (this.nowSelected < this.results.length - 1) {
          this.nowSelected += 1;
        }
      } else if (code == 13) {
        //兼容处理ie，使用enterHandle处理了。
      } else {
        if (this.searchTimeout) {
          clearTimeout(this.searchTimeout);
        }
        this.searchTimeout = setTimeout(() => {
          this.search(event.target);
        }, this.delay );
        // if(!this.mustMatch && !this.multiple) {
        //   this.setvalue('keyup');
        // }
      }
    },
    enterHandle(event) {
      event.preventDefault();
      if (this.nowSelected >= 0) {
        this.add(this.results[this.nowSelected]);
        this.setvalue('enter');
      } else {
        this.setvalue('enter');
      }
    },
    search(target) {
      let value = target.value;
      this.tempValue = value || null;
      if (value != this.object.title) {
        this.object.key = null;
        this.object.title = null;
        this.object.value = null;
      }
      if (value.length >= this.param.minWord) {
        if (this.dropdown) {
          this.dropdown.show();
        }
        if (utils.isFunction(this.param.loadData)) {
          this.loading = true;
          this.param.loadData.call(this.param, value, (datas) => {
            if (target.value === value) {
              this.loading = false;
              this.loadDatas = datas;
              this.dropdown.update();
            }
          });
        }
      }
      this.searchValue = value;
      this.dropdown.update();
    },
    add(data) {
      if (this.multiple) {
        this.objects.push(utils.copy(data));
      } else {
        this.object = utils.copy(data);
      }
      this.tempValue = null;
    },
    remove(object) {
      this.objects.splice(this.objects.indexOf(object), 1);
      this.setvalue('remove');
    },
    picker(data) {
      // log('picker');
      this.add(data);
      this.setvalue('picker');
    },
    setvalue(trigger) {
      if (this.disabled) return;
      this.nowSelected = -1;
      let value = this.oldValue = this.dispose();
      if (this.mustMatch || this.object.key || this.multiple) {
        this.tempValue = null;
      }
      this.focusValue = this.showValue;
      if(this.object.key === null) this.object.title = this.showValue;
      // console.log(trigger)
      this.$emit('input', value, trigger);
      this.$emit('change', utils.copy(this.multiple ? this.objects : this.object), trigger);
      let event = document.createEvent("CustomEvent");
      event.initCustomEvent("setvalue", true, true, value);
      this.$el.dispatchEvent(event);
      if(trigger){
        this.$emit(trigger, value);
      }
      if(trigger != 'keyup'){
        this.dropdown.hide();
      }
    },
    hide() {
      this.dropdown.hide();
    },
    clear() {
      this.tempValue = '';
      this.focusValue = '';
      this.object = {key: null, title: null, value: null};
      this.setvalue('clear');
    }
  },
  computed: {
    showPlaceholder() {
      return this.placeholder || this.t('h.autoComplate.placeholder');
    },
    showEmptyContent() {
      return this.emptyContent || this.t('h.autoComplate.emptyContent');
    },
    param() {
      if (this.config) {
        return utils.extend({}, config.getOption("autocomplete.default"), config.getOption(`autocomplete.configs.${this.config}`), this.option);
      } else {
        return utils.extend({}, config.getOption("autocomplete.default"), this.option);
      }
    },
    showValue() {
      return this.tempValue == null ? this.object.title : this.tempValue;
    },
    autocompleteCls() {
      let autosize = !!this.noBorder;
      if (!autosize) {
        autosize = this.autosize;
      }
      return {
        [`${prefix}`]: true,
        [`${prefix}-input-border`]: !this.noBorder,
        [`${prefix}-multiple`]: this.multiple,
        [`${prefix}-no-autosize`]: !autosize,
        [`${prefix}-disabled`]: this.disabled,
        focusing: this.focusing
      }
    },
    showCls() {
      return {
        [`${prefix}-show`]: true,
        [`${this.className}-show`]: !!this.className,
        focusing: this.focusing
      }
    },
    groupCls() {
      return {
        [`${prefix}-group`]: true,
        [`${prefix}-multiple`]: this.multiple,
        [`${this.className}-dropdown`]: !!this.className
      }
    },
    results() {
      let datas = this.datas;
      if (this.dict) {
        datas = config.getDict(this.dict);
      }
      if (utils.isNull(datas)) {
        datas = this.loadDatas;
      } else {
        datas = utils.initOptions(datas, this);
        if (this.searchValue) {
          let searchValue = this.searchValue.toLowerCase();
          datas = datas.filter((item) => {
            return (item.html || item[this.param.titleName] || '').toLowerCase().indexOf(searchValue) != -1;
          });
        }
      }
      if (this.objects.length > 0) {
        let keyArray = utils.getArray(this.objects, 'key').filter(item => !utils.isNull(item));
        datas = datas.filter((item) => {
          return keyArray.indexOf(item[this.param.keyName]) == -1;
        });
      }
      if (this.maxList) {
        datas.splice(0, this.maxList);
      }
      let results = [];
      for (let data of datas) {
        results.push(this.getValue(data));
      }
      return results;
    }
  }
};
</script>