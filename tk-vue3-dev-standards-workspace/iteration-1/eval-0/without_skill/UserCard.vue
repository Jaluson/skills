<template>
  <div class="user-card">
    <div v-for="user in users" :key="user.id" class="card">
      <h3>{{ user.name }}</h3>
      <p>{{ user.email }}</p>
      <button @click="deleteUser(user.id)">删除</button>
    </div>

    <div v-if="showConfirm" class="confirm-dialog">
      <p>确定要删除吗？</p>
      <button @click="confirmDelete">确定</button>
      <button @click="cancelDelete">取消</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'UserCard',
  data() {
    return {
      users: [
        { id: 1, name: '张三', email: 'zhangsan@example.com' },
        { id: 2, name: '李四', email: 'lisi@example.com' }
      ],
      showConfirm: false,
      userToDelete: null
    }
  },
  methods: {
    deleteUser(id) {
      this.userToDelete = id
      this.showConfirm = true
    },
    confirmDelete() {
      this.users = this.users.filter(u => u.id !== this.userToDelete)
      this.showConfirm = false
      this.userToDelete = null
    },
    cancelDelete() {
      this.showConfirm = false
      this.userToDelete = null
    }
  }
}
</script>

<style>
.user-card {
  padding: 20px;
}
.card {
  border: 1px solid #ccc;
  margin: 10px 0;
  padding: 10px;
}
</style>
