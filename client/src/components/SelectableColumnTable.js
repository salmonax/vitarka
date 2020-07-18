import React from 'react'
import { Select, Table } from 'antd'
import styles from 'antd/dist/antd.css'

const createTableColumns = (columnNames) => {
  return columnNames.map((n, i) => ({
    title: n,
    dataIndex: n
  }))
}

export default class SelectableColumnTable extends React.Component {
  constructor () {
    super()

    this.state = {
      selectedColumns: ['28', '31', '44', '39'],
      tableColumns: createTableColumns([
        'Id',
        'Name',
        'PlannedStartDate',
        'PlannedFinishDate'
      ])
    }

    this.columnSelected = this.columnSelected.bind(this)
    this.onRowSelected = this.onRowSelected.bind(this)
  }

  getDataColumns (data) {
    return Object.keys(data.head())
  }

  columnSelected (selectedColumns) {
    const dataColumns = this.getDataColumns(this.props.data)
    const tableColumns = selectedColumns.map(s => dataColumns[s]).map(s => ({
      title: s,
      dataIndex: s,
      key: s
    }))

    this.setState({ tableColumns, selectedColumns })
  }

  filterUpdated (input, option) {
    const label = option.props.children.toLowerCase()
    const filter = input.toLowerCase()

    return label.includes(filter)
  }

  onRowSelected (activityObjectId) {
    this.props.onRowSelected(activityObjectId)
  }

  render () {
    const rowSelectionConfig = {
      onChange: this.onRowSelected
    }

    return <div>
      <Select
        style={{ width: '100%' }}
        mode='multiple'
        placeholder='Select Columns'
        value={this.state.selectedColumns}
        filterOption={this.filterUpdated}
        onChange={this.columnSelected}>
        {this.renderOptions(this.props.data)}
      </Select>
      <Table
        rowKey='ObjectId'
        rowSelection={rowSelectionConfig}
        dataSource={this.props.data.getRawData()}
        columns={this.state.tableColumns}
      />
    </div>
  }

  renderOptions (activities) {
    return Object.keys(activities.head())
      .map((key, i) => <Select.Option key={i}>{key}</Select.Option>)
  }
}
