import { IPrimeFieldProps } from '@primecms/field';
import { Form, Input } from 'antd';
import { ValidationRule } from 'antd/lib/form'; // tslint:disable-line
import BraftEditor from 'braft-editor'; // tslint:disable-line
import { debounce } from 'lodash'; // tslint:disable-line
import { draftToMarkdown, markdownToDraft } from 'markdown-draft-js'; // tslint:disable-line
import * as React from 'react';

const allControls = [
  'headings', 'separator',
  'bold', 'italic', 'code', 'blockquote', 'separator',
  'list-ul', 'list-ol', 'separator',
  'link', 'emoji'
];

const markdownConfig = {
  preserveNewlines: true,
  remarkablePreset: 'full'
};

export class InputComponent extends React.PureComponent<IPrimeFieldProps> {

  public state = {
    value: BraftEditor.createEditorState(markdownToDraft(this.props.initialValue, markdownConfig))
  };

  public setMarkdownValue = debounce(
    () => {
      try {
        const { form, path } = this.props;
        form.setFieldsValue({
          [path]: draftToMarkdown(JSON.parse(this.state.value.toRAW()), markdownConfig).replace(/\n\n/g, '\n \n')
        });
      } catch (err) {
        console.error('Error converting rich text to markdown'); // tslint:disable-line no-console
      }
    },
    330
  );

  public onChange = (value: any) => { // tslint:disable-line no-any
    this.setState({ value }, this.setMarkdownValue);
  }

  public renderMarkdown = (rules: ValidationRule[]) => {
    const { form, field, path, initialValue = '' } = this.props;
    const { getFieldDecorator } = form;

    const controls = allControls.filter(item => {
      if (item === 'separator') {
        return true;
      }

      return field.options.md.indexOf(item) >= 0;
    })
    .filter((item, index, arr) => {
      if (item === 'separator' && (index === 0 || arr[index - 1] === item || (index - 1) === arr.length)) {
        return false;
      }

      return true;
    });

    // Add undo/redo
    controls.push('separator', 'undo', 'redo');

    return (
      <Form.Item label={field.title}>
        <BraftEditor
          controls={controls}
          value={this.state.value}
          onChange={this.onChange}
          language="en"
        />
        {getFieldDecorator(path, { initialValue, rules })(
          <input type="hidden" />
        )}
      </Form.Item>
    );
  }

  public renderMultiline = (rules: ValidationRule[]) => {
    const { form, field, path, initialValue = '' } = this.props;
    const { getFieldDecorator } = form;
    const maxRows = Number(field.options.maxLines);

    return (
      <Form.Item label={field.title}>
        {getFieldDecorator(path, { initialValue, rules })(
          <Input.TextArea
            autosize={{ minRows: 1, maxRows: maxRows > 0 ? maxRows : undefined }}
          />
        )}
      </Form.Item>
    );
  }

  public render() {
    const { form, field, path, initialValue = '' } = this.props;
    const { getFieldDecorator } = form;
    const rules = field.options.rules || {};

    const fieldRules: ValidationRule[] = [];

    if (rules.required) {
      fieldRules.push({
        required: true,
        message: `${field.title} is required`
      });
    }

    if (field.options.markdown || field.options.type === 'markdown') {
      return this.renderMarkdown(fieldRules);
    }

    if (field.options.multiline || field.options.type === 'multiline') {
      return this.renderMultiline(fieldRules);
    }

    if (rules.urlsafe) {
      fieldRules.push({
        pattern: /^[A-Za-z][A-Za-z0-9_-]*$/,
        message: `${field.title} must be url safe text`
      });
    }

    if (rules.min && rules.minValue) {
      const min = Number(rules.minValue);
      fieldRules.push({
        min,
        message: `${field.title} must have more than ${min} character${min === 1 ? '' : 's'}`
      });
    }

    if (rules.max && rules.maxValue) {
      const max = Number(rules.maxValue);
      fieldRules.push({
        max,
        message: `${field.title} must have less than ${max} character${max === 1 ? '' : 's'}`
      });
    }

    const error = form.getFieldError(path);
    const help = field.description && field.description !== '' ? `${field.description}${error ? ` - ${error}` : ''}` : undefined;

    return (
      <Form.Item label={field.title} help={help}>
        {getFieldDecorator(path, {
          initialValue,
          rules: fieldRules
        })(
          <Input size="large" />
        )}
      </Form.Item>
    );
  }
}
